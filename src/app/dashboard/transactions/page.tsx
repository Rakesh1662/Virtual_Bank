import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { MapPin, ArrowUpRight, ArrowDownLeft } from "lucide-react"

const transactions = [
    { id: 'txn_1', type: 'sent', amount: '50.00', commission: '0.50', counterparty: 'Jane Smith', timestamp: '2024-05-20 10:30 AM', location: 'New York, NY' },
    { id: 'txn_2', type: 'received', amount: '200.00', commission: '0.00', counterparty: 'John Doe', timestamp: '2024-05-19 02:45 PM', location: 'Los Angeles, CA' },
    { id: 'txn_3', type: 'sent', amount: '12.50', commission: '0.13', counterparty: 'Coffee Shop', timestamp: '2024-05-18 08:15 AM', location: 'Chicago, IL' },
    { id: 'txn_4', type: 'sent', amount: '150.00', commission: '1.50', counterparty: 'Online Store', timestamp: '2024-05-17 09:00 PM', location: 'Houston, TX' },
    { id: 'txn_5', type: 'received', amount: '1000.00', commission: '0.00', counterparty: 'Salary Deposit', timestamp: '2024-05-16 12:00 PM', location: 'Phoenix, AZ' },
    { id: 'txn_6', type: 'sent', amount: '25.00', commission: '0.25', counterparty: 'Bookstore', timestamp: '2024-05-15 04:50 PM', location: 'Philadelphia, PA' },
];

export default function TransactionsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          View and filter all your past transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <DatePicker />
          </div>
          <div className="flex gap-4">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Filter by amount..." type="number" className="w-[180px]" />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="hidden md:table-cell">Timestamp</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Badge variant={tx.type === 'sent' ? 'destructive' : 'secondary'} className="capitalize flex items-center gap-1 w-fit">
                        {tx.type === 'sent' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                        {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{tx.counterparty}</div>
                    <div className="text-xs text-muted-foreground">Commission: ₹{tx.commission}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{tx.timestamp}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {tx.location}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {tx.type === 'sent' ? '-' : '+'}₹{tx.amount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
