import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/context/AppContext";
import { api, type ExpiryItem } from "@/lib/api";
import { expiryBadgeClass, formatDate, formatTimeUntilExpiry } from "@/lib/utils";

function expiryStatusLabel(t: (key: string) => string, status: string) {
  switch (status) {
    case "expired": return t("expired_label");
    case "expiring_soon": return t("expiring_soon_label");
    case "monitor": return t("monitor");
    default: return t("safe");
  }
}

export function ExpiryPage() {
  const { markExpirySeen, t } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const filter = searchParams.get("filter") || "";

  useEffect(() => {
    void markExpirySeen();
    api.listExpiryItems(filter || undefined).then(setItems);
  }, [filter, markExpirySeen]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("expiry")}</h1>
          <p className="text-muted-foreground">{t("expiry_subtitle")}</p>
        </div>
        <Select value={filter} onChange={(e) => setSearchParams(e.target.value ? { filter: e.target.value } : {})} className="w-48">
          <option value="">{t("filter_all")}</option>
          <option value="expired">{t("filter_expired")}</option>
          <option value="expiring_soon">{t("filter_expiring")}</option>
          <option value="monitor">{t("filter_monitor")}</option>
          <option value="safe">{t("filter_safe")}</option>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("batch_expiry_status")}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("medicine")}</TableHead>
                <TableHead>{t("batch")}</TableHead>
                <TableHead>{t("expiry_date")}</TableHead>
                <TableHead>{t("time_left")}</TableHead>
                <TableHead>{t("quantity")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.batch_id}>
                  <TableCell className="font-medium">{item.medicine_name}</TableCell>
                  <TableCell>{item.batch_number}</TableCell>
                  <TableCell>{formatDate(item.expiry_date)}</TableCell>
                  <TableCell>{formatTimeUntilExpiry(item.days_until_expiry)}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    <Badge className={expiryBadgeClass(item.expiry_status)}>{expiryStatusLabel(t, item.expiry_status)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("no_batches")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
