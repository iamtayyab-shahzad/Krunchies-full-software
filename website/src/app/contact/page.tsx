"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MapPin, Mail, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settings } from "@/data/mock";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone"),
  message: z.string().min(10, "Message is too short"),
});

type FormValues = z.infer<typeof schema>;

export default function ContactPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 400));
    toast.success("Message sent! We'll get back to you soon.");
    reset();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-5xl text-white">Contact</h1>
      <p className="mt-2 text-zinc-400">
        Questions, feedback, or catering inquiries — we&apos;d love to hear from
        you.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex gap-3 text-zinc-300">
            <MapPin className="mt-0.5 h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-white">Address</p>
              <p className="text-sm text-zinc-400">{settings.address}</p>
            </div>
          </div>
          <div className="flex gap-3 text-zinc-300">
            <Phone className="mt-0.5 h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-white">Phone</p>
              <a
                href={`tel:${settings.phone}`}
                className="text-sm text-zinc-400 hover:text-orange-400"
              >
                {settings.phone}
              </a>
            </div>
          </div>
          <div className="flex gap-3 text-zinc-300">
            <Mail className="mt-0.5 h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-white">Email</p>
              <a
                href={`mailto:${settings.email}`}
                className="text-sm text-zinc-400 hover:text-orange-400"
              >
                {settings.email}
              </a>
            </div>
          </div>
          <div className="flex gap-3 text-zinc-300">
            <Clock className="mt-0.5 h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-white">Hours</p>
              <p className="text-sm text-zinc-400">
                Daily {settings.opening_time} – {settings.closing_time}
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && (
                <p className="text-xs text-red-400">{errors.phone.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" {...register("message")} />
            {errors.message && (
              <p className="text-xs text-red-400">{errors.message.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </div>
    </div>
  );
}
