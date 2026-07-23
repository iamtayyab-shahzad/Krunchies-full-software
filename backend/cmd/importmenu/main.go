// Command importmenu populates (and keeps in sync) the catalog tables from the
// canonical Krunchies menu file at shared/krunchies-menu.json.
//
// It is fully idempotent: every category, product, product size and offer is
// upserted by its deterministic UUID, so re-running the command updates existing
// rows instead of creating duplicates. The generated IDs match the scheme used
// by the POS/website adapters (pos/src/data/krunchies.ts) so all applications
// read exactly the same records.
//
// Usage (from the backend/ directory):
//
//	go run ./cmd/importmenu            # upsert catalog + offers
//	go run ./cmd/importmenu -prune     # also delete non-menu (demo) rows that
//	                                    # are not referenced by any order
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type menuFile struct {
	Restaurant struct {
		Currency string `json:"currency"`
	} `json:"restaurant"`
	Promotions []struct {
		ID          string `json:"id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Image       string `json:"image"`
		Active      bool   `json:"active"`
		StartDate   string `json:"startDate"`
		EndDate     string `json:"endDate"`
	} `json:"promotions"`
	Locations []struct {
		ID             string `json:"id"`
		Name           string `json:"name"`
		DeliveryCharge int    `json:"deliveryCharge"`
	} `json:"locations"`
	Categories []struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		Slug         string `json:"slug"`
		Image        string `json:"image"`
		DisplayOrder int    `json:"displayOrder"`
	} `json:"categories"`
	Products []struct {
		ID          string `json:"id"`
		Category    string `json:"category"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Image       string `json:"image"`
		Featured    bool   `json:"featured"`
		Sizes       []struct {
			Name  string `json:"name"`
			Price int    `json:"price"`
		} `json:"sizes"`
	} `json:"products"`
}

func main() {
	prune := flag.Bool("prune", false, "delete catalog/offer rows not present in the menu file (skips rows referenced by orders)")
	flag.Parse()

	menu, err := loadMenu()
	if err != nil {
		log.Fatalf("load menu: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := database.Connect(cfg.Database)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	now := time.Now()

	// Build all rows with deterministic IDs.
	locations := make([]domain.Location, 0, len(menu.Locations))
	locationIDs := make([]string, 0, len(menu.Locations))
	for _, l := range menu.Locations {
		id := uuid.MustParse(l.ID)
		locationIDs = append(locationIDs, l.ID)
		locations = append(locations, domain.Location{
			BaseModel:      domain.BaseModel{ID: id, CreatedAt: now, UpdatedAt: now},
			Name:           l.Name,
			DeliveryCharge: l.DeliveryCharge,
		})
	}

	categoryIDBySlug := make(map[string]uuid.UUID, len(menu.Categories))
	categories := make([]domain.Category, 0, len(menu.Categories))
	catIDs := make([]string, 0, len(menu.Categories))
	for _, c := range menu.Categories {
		id := uuid.MustParse(c.ID)
		categoryIDBySlug[c.Slug] = id
		catIDs = append(catIDs, c.ID)
		categories = append(categories, domain.Category{
			BaseModel:    domain.BaseModel{ID: id, CreatedAt: now, UpdatedAt: now},
			Name:         c.Name,
			Image:        c.Image,
			DisplayOrder: c.DisplayOrder,
			Visible:      true,
		})
	}

	products := make([]domain.Product, 0, len(menu.Products))
	sizes := make([]domain.ProductSize, 0)
	prodIDs := make([]string, 0, len(menu.Products))
	sizeIDs := make([]string, 0)
	for index, p := range menu.Products {
		categoryID, ok := categoryIDBySlug[p.Category]
		if !ok {
			log.Fatalf("product %q references unknown category slug %q", p.Name, p.Category)
		}
		productID := uuid.MustParse(p.ID)
		prodIDs = append(prodIDs, p.ID)
		products = append(products, domain.Product{
			BaseModel:    domain.BaseModel{ID: productID, CreatedAt: now, UpdatedAt: now},
			CategoryID:   categoryID,
			Name:         p.Name,
			Description:  p.Description,
			Image:        p.Image,
			Featured:     p.Featured,
			Available:    true,
			DisplayOrder: index + 1,
		})
		for sizeIndex, s := range p.Sizes {
			sid := sizeID(p.ID, sizeIndex)
			sizeIDs = append(sizeIDs, sid)
			sizes = append(sizes, domain.ProductSize{
				BaseModel: domain.BaseModel{ID: uuid.MustParse(sid), CreatedAt: now, UpdatedAt: now},
				ProductID: productID,
				Size:      s.Name,
				Price:     s.Price,
			})
		}
	}

	// Offers = promotions (from the promotions block) + one offer per deal product,
	// mirroring the flags produced by the POS syncKrunchiesMenu adapter.
	offers := make([]domain.Offer, 0)
	offerIDs := make([]string, 0)
	for _, promo := range menu.Promotions {
		start := parseDate(promo.StartDate)
		end := parseDate(promo.EndDate)
		offerIDs = append(offerIDs, promo.ID)
		offers = append(offers, domain.Offer{
			BaseModel:     domain.BaseModel{ID: uuid.MustParse(promo.ID), CreatedAt: now, UpdatedAt: now},
			Title:         promo.Title,
			Description:   promo.Description,
			Image:         promo.Image,
			Active:        promo.Active,
			OfferPopup:    start != nil || end != nil,
			HomepageDeal:  true,
			DiscountLabel: promo.Title,
			StartDate:     start,
			EndDate:       end,
		})
	}
	dealIndex := 0
	for _, p := range menu.Products {
		if p.Category != "deals" {
			continue
		}
		dealIndex++
		id := fmt.Sprintf("40000000-0000-4000-8000-%012d", dealIndex)
		price := 0
		if len(p.Sizes) > 0 {
			price = p.Sizes[0].Price
		}
		offerIDs = append(offerIDs, id)
		offers = append(offers, domain.Offer{
			BaseModel:     domain.BaseModel{ID: uuid.MustParse(id), CreatedAt: now, UpdatedAt: now},
			Title:         p.Name,
			Description:   fmt.Sprintf("%s — %s %s", p.Description, menu.Restaurant.Currency, groupThousands(price)),
			Image:         p.Image,
			Active:        true,
			OfferPopup:    false,
			HomepageDeal:  true,
			DiscountLabel: p.Name,
		})
	}

	err = db.Transaction(func(tx *gorm.DB) error {
		if err := upsert(tx, &locations, "name", "delivery_charge", "updated_at"); err != nil {
			return fmt.Errorf("locations: %w", err)
		}
		if err := upsert(tx, &categories, "name", "image", "display_order", "visible", "updated_at"); err != nil {
			return fmt.Errorf("categories: %w", err)
		}
		if err := upsert(tx, &products, "category_id", "name", "description", "image", "featured", "available", "display_order", "updated_at"); err != nil {
			return fmt.Errorf("products: %w", err)
		}
		if err := upsert(tx, &sizes, "product_id", "size", "price", "updated_at"); err != nil {
			return fmt.Errorf("product sizes: %w", err)
		}
		if err := upsert(tx, &offers, "title", "description", "image", "active", "offer_popup", "homepage_deal", "discount_label", "start_date", "end_date", "updated_at"); err != nil {
			return fmt.Errorf("offers: %w", err)
		}
		return nil
	})
	if err != nil {
		log.Fatalf("import: %v", err)
	}

	fmt.Printf("Imported catalog: %d locations, %d categories, %d products, %d sizes, %d offers\n",
		len(locations), len(categories), len(products), len(sizes), len(offers))

	if *prune {
		pruneNonMenuRows(db, catIDs, prodIDs, sizeIDs, offerIDs, locationIDs)
	}
	fmt.Println("Menu import complete.")
}

// upsert inserts the rows or, on primary-key conflict, updates the given columns.
func upsert[T any](tx *gorm.DB, rows *[]T, updateColumns ...string) error {
	if len(*rows) == 0 {
		return nil
	}
	return tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns(updateColumns),
	}).Create(rows).Error
}

// pruneNonMenuRows removes demo/placeholder rows that are not part of the menu.
// Rows still referenced by orders are preserved to protect referential integrity.
func pruneNonMenuRows(db *gorm.DB, catIDs, prodIDs, sizeIDs, offerIDs, locationIDs []string) {
	if res := db.Where("id::text NOT IN ?", offerIDs).Delete(&domain.Offer{}); res.Error != nil {
		log.Printf("prune offers: %v", res.Error)
	} else if res.RowsAffected > 0 {
		fmt.Printf("Pruned %d stale offer(s)\n", res.RowsAffected)
	}

	if res := db.
		Where("id::text NOT IN ?", sizeIDs).
		Where("id NOT IN (SELECT product_size_id FROM order_items)").
		Delete(&domain.ProductSize{}); res.Error != nil {
		log.Printf("prune product sizes: %v", res.Error)
	} else if res.RowsAffected > 0 {
		fmt.Printf("Pruned %d stale product size(s)\n", res.RowsAffected)
	}

	if res := db.
		Where("id::text NOT IN ?", prodIDs).
		Where("id NOT IN (SELECT product_id FROM order_items)").
		Where("id NOT IN (SELECT product_id FROM product_sizes)").
		Delete(&domain.Product{}); res.Error != nil {
		log.Printf("prune products: %v", res.Error)
	} else if res.RowsAffected > 0 {
		fmt.Printf("Pruned %d stale product(s)\n", res.RowsAffected)
	}

	if res := db.
		Where("id::text NOT IN ?", catIDs).
		Where("id NOT IN (SELECT category_id FROM products)").
		Delete(&domain.Category{}); res.Error != nil {
		log.Printf("prune categories: %v", res.Error)
	} else if res.RowsAffected > 0 {
		fmt.Printf("Pruned %d stale category(ies)\n", res.RowsAffected)
	}

	if len(locationIDs) > 0 {
		if res := db.
			Where("id::text NOT IN ?", locationIDs).
			Where("id NOT IN (SELECT location_id FROM orders WHERE location_id IS NOT NULL)").
			Delete(&domain.Location{}); res.Error != nil {
			log.Printf("prune locations: %v", res.Error)
		} else if res.RowsAffected > 0 {
			fmt.Printf("Pruned %d stale location(s)\n", res.RowsAffected)
		}
	}
}

// sizeID mirrors the deterministic size-id scheme in pos/src/data/krunchies.ts so
// the importer and the frontend sync always agree on identifiers.
func sizeID(productID string, index int) string {
	tail := productID
	if len(tail) > 12 {
		tail = tail[len(tail)-12:]
	}
	serial, _ := strconv.ParseInt(tail, 10, 64)
	return fmt.Sprintf("30000000-0000-4000-8000-%012d", serial*10+int64(index)+1)
}

func parseDate(s string) *time.Time {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

func groupThousands(n int) string {
	s := strconv.Itoa(n)
	neg := strings.HasPrefix(s, "-")
	if neg {
		s = s[1:]
	}
	var b strings.Builder
	for i, digit := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(digit)
	}
	if neg {
		return "-" + b.String()
	}
	return b.String()
}

func loadMenu() (*menuFile, error) {
	candidates := []string{
		os.Getenv("MENU_FILE"),
		"../shared/krunchies-menu.json",
		"shared/krunchies-menu.json",
		"../../shared/krunchies-menu.json",
	}
	var lastErr error
	for _, path := range candidates {
		if path == "" {
			continue
		}
		data, err := os.ReadFile(path)
		if err != nil {
			lastErr = err
			continue
		}
		var menu menuFile
		if err := json.Unmarshal(data, &menu); err != nil {
			return nil, fmt.Errorf("parse %s: %w", path, err)
		}
		fmt.Printf("Loaded menu from %s\n", path)
		return &menu, nil
	}
	return nil, fmt.Errorf("menu file not found (set MENU_FILE); last error: %v", lastErr)
}
