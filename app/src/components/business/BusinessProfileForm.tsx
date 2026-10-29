import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  businessProfileSchema,
  INDUSTRIES,
  DAY_NAMES,
  type BusinessProfile,
  type BusinessProfileInput,
} from "@/lib/business/schema";

export function BusinessProfileForm({
  initial,
  onSubmit,
  submitLabel = "Save changes",
}: {
  initial: BusinessProfile;
  onSubmit: (values: BusinessProfile) => Promise<void>;
  submitLabel?: string;
}) {
  const form = useForm<BusinessProfileInput, any, BusinessProfile>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: initial,
  });

  const services = useFieldArray({ control: form.control, name: "services" });
  const faqs = useFieldArray({ control: form.control, name: "faqs" });
  const staff = useFieldArray({ control: form.control, name: "staff" });
  const hours = useFieldArray({ control: form.control, name: "hours" });

  const saving = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <section className="card-elevated space-y-4 p-6">
          <h3 className="eyebrow">Business info</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="card-elevated space-y-3 p-6">
          <h3 className="eyebrow">Description</h3>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="What does your business do?"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        <section className="card-elevated space-y-3 p-6">
          <h3 className="eyebrow">Hours</h3>
          <div className="space-y-2">
            {hours.fields.map((f, i) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="w-24 text-sm font-medium text-foreground">
                  {DAY_NAMES[form.watch(`hours.${i}.day_of_week`) ?? i] ?? ""}
                </span>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={!form.watch(`hours.${i}.enabled`)}
                    onCheckedChange={(v) => form.setValue(`hours.${i}.enabled`, !v)}
                  />
                  Closed
                </label>
                {form.watch(`hours.${i}.enabled`) && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-32"
                      {...form.register(`hours.${i}.open_time`)}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      className="w-32"
                      {...form.register(`hours.${i}.close_time`)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card-elevated space-y-3 p-6">
          <div className="flex items-center justify-between">
            <h3 className="eyebrow">Services</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                services.append({
                  name: "",
                  price: null,
                  price_note: "",
                  duration_minutes: null,
                  description: "",
                })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add service
            </Button>
          </div>
          <div className="space-y-3">
            {services.fields.map((f, i) => (
              <div
                key={f.id}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_100px_auto]"
              >
                <Input placeholder="Service name" {...form.register(`services.${i}.name`)} />
                <Input
                  placeholder="Price (e.g. $50)"
                  {...form.register(`services.${i}.price_note`)}
                />
                <Input
                  type="number"
                  placeholder="Minutes"
                  {...form.register(`services.${i}.duration_minutes`, { valueAsNumber: true })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => services.remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Textarea
                  className="sm:col-span-4"
                  placeholder="Description (optional)"
                  rows={2}
                  {...form.register(`services.${i}.description`)}
                />
              </div>
            ))}
            {services.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No services added yet.</p>
            )}
          </div>
        </section>

        <section className="card-elevated space-y-3 p-6">
          <div className="flex items-center justify-between">
            <h3 className="eyebrow">FAQs</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => faqs.append({ question: "", answer: "" })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ
            </Button>
          </div>
          <div className="space-y-3">
            {faqs.fields.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input placeholder="Question" {...form.register(`faqs.${i}.question`)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => faqs.remove(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <Textarea placeholder="Answer" rows={2} {...form.register(`faqs.${i}.answer`)} />
              </div>
            ))}
            {faqs.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No FAQs added yet.</p>
            )}
          </div>
        </section>

        <section className="card-elevated space-y-3 p-6">
          <div className="flex items-center justify-between">
            <h3 className="eyebrow">Staff</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => staff.append({ name: "", role: "", phone: "", email: "" })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add person
            </Button>
          </div>
          <div className="space-y-2">
            {staff.fields.map((f, i) => (
              <div
                key={f.id}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <Input placeholder="Name" {...form.register(`staff.${i}.name`)} />
                <Input placeholder="Role" {...form.register(`staff.${i}.role`)} />
                <Input placeholder="Phone" {...form.register(`staff.${i}.phone`)} />
                <Input placeholder="Email" {...form.register(`staff.${i}.email`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => staff.remove(i)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {staff.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No staff added yet.</p>
            )}
          </div>
        </section>

        <section className="card-elevated space-y-4 p-6">
          <h3 className="eyebrow">Policies & rules</h3>
          <FormField
            control={form.control}
            name="policies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>General policies</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="booking_rules"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Booking rules</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cancellation_rules"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cancellation rules</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        <div className="flex justify-end pb-4">
          <Button type="submit" size="lg" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
