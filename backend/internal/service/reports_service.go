package service

import (
	"time"

	"backend/internal/domain"
	"backend/internal/repository"

	"gorm.io/gorm"
)

type ReportService struct {
	db           *gorm.DB
	inventory    *repository.InventoryRepository
	expenses     *ExpenseService
}

func NewReportService(db *gorm.DB) *ReportService {
	return &ReportService{
		db:        db,
		inventory: repository.NewInventoryRepository(db),
		expenses:  NewExpenseService(db),
	}
}

// ProfitLoss is the owner-facing P&L for a date window.
type ProfitLoss struct {
	Start             time.Time `json:"start"`
	End               time.Time `json:"end"`
	Revenue           int       `json:"revenue"`
	CompletedOrders   int64     `json:"completed_orders"`
	CancelledOrders   int64     `json:"cancelled_orders"`
	COGS              int       `json:"cogs"`
	GrossProfit       int       `json:"gross_profit"`
	Expenses          int       `json:"expenses"`
	WastageCost       int       `json:"wastage_cost"`
	NetProfit         int       `json:"net_profit"`
	FoodCostPercent   float64   `json:"food_cost_percent"`
	InventoryValue    int       `json:"inventory_value"`
	PurchasesSpend    int       `json:"purchases_spend"`
	BestSelling       []ProductPerf `json:"best_selling"`
	LeastSelling      []ProductPerf `json:"least_selling"`
	MostProfitable    []ProductPerf `json:"most_profitable"`
	LeastProfitable   []ProductPerf `json:"least_profitable"`
	ExpenseBreakdown  []ExpenseBucket `json:"expense_breakdown"`
}

type ProductPerf struct {
	ProductID   string  `json:"product_id"`
	ProductName string  `json:"product_name"`
	Quantity    int     `json:"quantity"`
	Revenue     int     `json:"revenue"`
	Cost        int     `json:"cost"`
	Profit      int     `json:"profit"`
	MarginPct   float64 `json:"margin_pct"`
}

type ExpenseBucket struct {
	Category string `json:"category"`
	Total    int    `json:"total"`
}

// ProfitLossBetween builds the full P&L for [start, end).
func (s *ReportService) ProfitLossBetween(start, end time.Time) (*ProfitLoss, error) {
	pl := &ProfitLoss{Start: start, End: end}

	var revenue int
	if err := s.db.Model(&domain.Order{}).
		Select("COALESCE(SUM(grand_total), 0)").
		Where("order_status = ? AND created_at >= ? AND created_at < ?", "COMPLETED", start, end).
		Scan(&revenue).Error; err != nil {
		return nil, err
	}
	pl.Revenue = revenue

	if err := s.db.Model(&domain.Order{}).
		Where("order_status = ? AND created_at >= ? AND created_at < ?", "COMPLETED", start, end).
		Count(&pl.CompletedOrders).Error; err != nil {
		return nil, err
	}
	if err := s.db.Model(&domain.Order{}).
		Where("order_status = ? AND created_at >= ? AND created_at < ?", "CANCELLED", start, end).
		Count(&pl.CancelledOrders).Error; err != nil {
		return nil, err
	}

	cogs, err := s.inventory.ConsumptionCostBetween(start, end)
	if err != nil {
		return nil, err
	}
	pl.COGS = cogs
	pl.GrossProfit = pl.Revenue - pl.COGS

	wastage, err := s.inventory.WastageCostBetween(start, end)
	if err != nil {
		return nil, err
	}
	pl.WastageCost = wastage

	expenses, err := s.expenses.TotalBetween(start, end)
	if err != nil {
		return nil, err
	}
	pl.Expenses = expenses
	pl.NetProfit = pl.GrossProfit - pl.Expenses - pl.WastageCost

	if pl.Revenue > 0 {
		pl.FoodCostPercent = (float64(pl.COGS) / float64(pl.Revenue)) * 100
	}

	if pl.InventoryValue, err = s.inventory.StockValue(); err != nil {
		return nil, err
	}
	if pl.PurchasesSpend, err = s.inventory.PurchaseCostBetween(start, end); err != nil {
		return nil, err
	}

	perfs, err := s.productPerformance(start, end)
	if err != nil {
		return nil, err
	}
	pl.BestSelling = topByQty(perfs, true, 10)
	pl.LeastSelling = topByQty(perfs, false, 10)
	pl.MostProfitable = topByProfit(perfs, true, 10)
	pl.LeastProfitable = topByProfit(perfs, false, 10)

	pl.ExpenseBreakdown, err = s.expenseBreakdown(start, end)
	if err != nil {
		return nil, err
	}
	return pl, nil
}

func (s *ReportService) productPerformance(start, end time.Time) ([]ProductPerf, error) {
	type row struct {
		ProductID   string
		ProductName string
		Quantity    int
		Revenue     int
	}
	var rows []row
	err := s.db.Table("order_items").
		Select(`order_items.product_id,
			COALESCE(products.name, '') as product_name,
			COALESCE(SUM(order_items.quantity), 0) as quantity,
			COALESCE(SUM(order_items.price * order_items.quantity), 0) as revenue`).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Joins("LEFT JOIN products ON products.id = order_items.product_id").
		Where("orders.order_status = ? AND orders.created_at >= ? AND orders.created_at < ?",
			"COMPLETED", start, end).
		Group("order_items.product_id, products.name").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	// Approximate COGS per product from its recipe lines × avg cost × qty sold.
	// Size-agnostic: uses any recipe line for the product (sized lines preferred
	// later; for reporting an average of all lines is acceptable).
	type costRow struct {
		ProductID string
		UnitCost  int64
	}
	var costs []costRow
	_ = s.db.Raw(`
		SELECT r.product_id::text as product_id,
			COALESCE(SUM(r.quantity_required * i.avg_cost_micros), 0) as unit_cost
		FROM recipes r
		JOIN inventories i ON i.id = r.inventory_id
		GROUP BY r.product_id
	`).Scan(&costs).Error
	costByProduct := map[string]int64{}
	for _, c := range costs {
		costByProduct[c.ProductID] = c.UnitCost
	}

	out := make([]ProductPerf, 0, len(rows))
	for _, r := range rows {
		unitCost := costByProduct[r.ProductID]
		cost := domain.ValueFromMicros(unitCost, int64(r.Quantity))
		profit := r.Revenue - cost
		margin := 0.0
		if r.Revenue > 0 {
			margin = (float64(profit) / float64(r.Revenue)) * 100
		}
		out = append(out, ProductPerf{
			ProductID:   r.ProductID,
			ProductName: r.ProductName,
			Quantity:    r.Quantity,
			Revenue:     r.Revenue,
			Cost:        cost,
			Profit:      profit,
			MarginPct:   margin,
		})
	}
	return out, nil
}

func (s *ReportService) expenseBreakdown(start, end time.Time) ([]ExpenseBucket, error) {
	var rows []ExpenseBucket
	err := s.db.Model(&domain.Expense{}).
		Select("category, COALESCE(SUM(amount), 0) as total").
		Where("expense_date >= ? AND expense_date < ?", start, end).
		Group("category").
		Order("total desc").
		Scan(&rows).Error
	return rows, err
}

func topByQty(rows []ProductPerf, desc bool, n int) []ProductPerf {
	cp := append([]ProductPerf{}, rows...)
	for i := 0; i < len(cp); i++ {
		for j := i + 1; j < len(cp); j++ {
			if (desc && cp[j].Quantity > cp[i].Quantity) || (!desc && cp[j].Quantity < cp[i].Quantity) {
				cp[i], cp[j] = cp[j], cp[i]
			}
		}
	}
	if len(cp) > n {
		cp = cp[:n]
	}
	return cp
}

func topByProfit(rows []ProductPerf, desc bool, n int) []ProductPerf {
	cp := append([]ProductPerf{}, rows...)
	for i := 0; i < len(cp); i++ {
		for j := i + 1; j < len(cp); j++ {
			if (desc && cp[j].Profit > cp[i].Profit) || (!desc && cp[j].Profit < cp[i].Profit) {
				cp[i], cp[j] = cp[j], cp[i]
			}
		}
	}
	if len(cp) > n {
		cp = cp[:n]
	}
	return cp
}
