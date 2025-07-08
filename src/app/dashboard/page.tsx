import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownLeft, Wallet, Landmark } from "lucide-react"

const recentTransactions = [
  { id: 'txn_1', type: 'sent', counterparty: 'Jane Smith', amount: '50.00', date: '2024-05-20' },
  { id: 'txn_2', type: 'received', counterparty: 'Coffee Shop', amount: '12.50', date: '2024-05-19' },
  { id: 'txn_3', type: 'sent', counterparty: 'Online Store', amount: '150.00', date: '2024-05-18' },
  { id: 'txn_4', type: 'received', counterparty: 'John Doe', amount: '200.00', date: '2024-05-17' },
];

export default function DashboardPage() {
  return (
    <>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Account Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹45,231.89</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Commission Paid
              </CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹125.30</div>
              <p className="text-xs text-muted-foreground">
                Total commission on transfers
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                A quick look at your last few transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Counterparty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="font-medium">{tx.counterparty}</div>
                      </TableCell>
                      <TableCell className="text-right">₹{tx.amount}</TableCell>
                      <TableCell className="hidden sm:table-cell">{tx.date}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={tx.type === 'sent' ? 'destructive' : 'secondary'} className="capitalize">
                            {tx.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send Money</CardTitle>
              <CardDescription>
                Quickly transfer funds to another user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient-mobile">Recipient's Mobile</Label>
                <Input id="recipient-mobile" placeholder="Enter 10-digit mobile no." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input id="amount" placeholder="0.00" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mpin">Your MPIN</Label>
                <Input id="mpin" placeholder="••••" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-accent hover:bg-accent/90">
                Send Money
              </Button>
            </CardFooter>
          </Card>
        </div>
    </>
  );
}
