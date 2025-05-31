"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Download, Printer, Calendar, Upload, X, Building2, User, FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { useToast } from "@/components/ui/use-toast"

interface LineItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

interface InvoiceData {
  invoiceNumber: string
  date: string
  dueDate: string
  companyName: string
  companyAddress: string
  companyEmail: string
  companyPhone: string
  companyLogo: string | null
  clientName: string
  clientAddress: string
  clientEmail: string
  clientPhone: string
  lineItems: LineItem[]
  notes: string
  taxRate: number
}

export default function InvoiceGenerator() {
  const { toast } = useToast()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    companyName: "",
    companyAddress: "",
    companyEmail: "",
    companyPhone: "",
    companyLogo: null,
    clientName: "",
    clientAddress: "",
    clientEmail: "",
    clientPhone: "",
    lineItems: [{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }],
    notes: "",
    taxRate: 10,
  })

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    }
    setInvoiceData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }))
  }

  const removeLineItem = (id: string) => {
    if (invoiceData.lineItems.length > 1) {
      setInvoiceData((prev) => ({
        ...prev,
        lineItems: prev.lineItems.filter((item) => item.id !== id),
      }))
    }
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setInvoiceData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          if (field === "quantity" || field === "rate") {
            updatedItem.amount = Number(updatedItem.quantity) * Number(updatedItem.rate)
          }
          return updatedItem
        }
        return item
      }),
    }))
  }

  const subtotal = invoiceData.lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const taxAmount = (subtotal * Number(invoiceData.taxRate || 0)) / 100
  const total = subtotal + taxAmount

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    if (!invoiceRef.current) return

    setIsGeneratingPdf(true)

    try {
      // Add a class to prepare for PDF generation
      invoiceRef.current.classList.add("generating-pdf")

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      })

      // Remove the class after capturing
      invoiceRef.current.classList.remove("generating-pdf")

      const imgData = canvas.toDataURL("image/png")

      // Calculate PDF dimensions based on canvas
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF("p", "mm", "a4")

      let position = 0

      // Add image to PDF
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)

      // If the image is longer than a page, add more pages
      const pdfHeight = pdf.internal.pageSize.getHeight()
      if (imgHeight > pdfHeight) {
        let heightLeft = imgHeight

        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
          heightLeft -= pdfHeight
        }
      }

      // Save the PDF
      pdf.save(`Invoice-${invoiceData.invoiceNumber}.pdf`)

      toast({
        title: "PDF Generated Successfully",
        description: `Invoice-${invoiceData.invoiceNumber}.pdf has been downloaded.`,
        duration: 5000,
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error Generating PDF",
        description: "There was a problem creating your PDF. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      if (file.size <= 2 * 1024 * 1024) {
        // 2MB limit
        const reader = new FileReader()
        reader.onloadend = () => {
          setInvoiceData((prev) => ({
            ...prev,
            companyLogo: reader.result as string,
          }))
        }
        reader.readAsDataURL(file)
      } else {
        toast({
          title: "File Too Large",
          description: "Please select an image file smaller than 2MB",
          variant: "destructive",
          duration: 5000,
        })
      }
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please select a valid image file (PNG, JPG, etc.)",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const removeLogo = () => {
    setInvoiceData((prev) => ({
      ...prev,
      companyLogo: null,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full mb-3 sm:mb-4">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Invoice Generator</h1>
          <p className="text-base sm:text-lg text-gray-600">Create professional invoices with ease</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Form Section */}
          <div className="space-y-4 sm:space-y-6">
            {/* Company Details */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full">
                    <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  </div>
                  Your Company Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Logo Upload Section */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-3 sm:mb-4">
                    {invoiceData.companyLogo ? (
                      <div className="relative">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                          <img
                            src={invoiceData.companyLogo || "/placeholder.svg"}
                            alt="Company Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                          onClick={removeLogo}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition-colors">
                      {invoiceData.companyLogo ? "Change Logo" : "Upload Logo"}
                    </div>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </Label>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 2MB</p>
                </div>

                <div className="grid gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      value={invoiceData.companyName}
                      onChange={(e) => setInvoiceData((prev) => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Your Company Name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyAddress" className="text-sm font-medium text-gray-700">
                      Address
                    </Label>
                    <Textarea
                      id="companyAddress"
                      value={invoiceData.companyAddress}
                      onChange={(e) => setInvoiceData((prev) => ({ ...prev, companyAddress: e.target.value }))}
                      placeholder="123 Business St, City, State 12345"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="companyEmail" className="text-sm font-medium text-gray-700">
                        Email
                      </Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={invoiceData.companyEmail}
                        onChange={(e) => setInvoiceData((prev) => ({ ...prev, companyEmail: e.target.value }))}
                        placeholder="hello@company.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="companyPhone" className="text-sm font-medium text-gray-700">
                        Phone
                      </Label>
                      <Input
                        id="companyPhone"
                        value={invoiceData.companyPhone}
                        onChange={(e) => setInvoiceData((prev) => ({ ...prev, companyPhone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Details */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  </div>
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="clientName" className="text-sm font-medium text-gray-700">
                    Client Name
                  </Label>
                  <Input
                    id="clientName"
                    value={invoiceData.clientName}
                    onChange={(e) => setInvoiceData((prev) => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Client Company Name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="clientAddress" className="text-sm font-medium text-gray-700">
                    Address
                  </Label>
                  <Textarea
                    id="clientAddress"
                    value={invoiceData.clientAddress}
                    onChange={(e) => setInvoiceData((prev) => ({ ...prev, clientAddress: e.target.value }))}
                    placeholder="456 Client Ave, City, State 67890"
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="clientEmail" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={invoiceData.clientEmail}
                      onChange={(e) => setInvoiceData((prev) => ({ ...prev, clientEmail: e.target.value }))}
                      placeholder="client@company.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone" className="text-sm font-medium text-gray-700">
                      Phone
                    </Label>
                    <Input
                      id="clientPhone"
                      value={invoiceData.clientPhone}
                      onChange={(e) => setInvoiceData((prev) => ({ ...prev, clientPhone: e.target.value }))}
                      placeholder="+1 (555) 987-6543"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                  </div>
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="invoiceNumber" className="text-sm font-medium text-gray-700">
                      Invoice Number
                    </Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => setInvoiceData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                      Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={invoiceData.date}
                      onChange={(e) => setInvoiceData((prev) => ({ ...prev, date: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">
                      Due Date
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) => setInvoiceData((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="taxRate" className="text-sm font-medium text-gray-700">
                    Tax Rate (%)
                  </Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={invoiceData.taxRate}
                    onChange={(e) =>
                      setInvoiceData((prev) => ({ ...prev, taxRate: Number.parseFloat(e.target.value) || 0 }))
                    }
                    min="0"
                    max="100"
                    step="0.1"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <span className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                    <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                    </div>
                    Line Items
                    <Badge variant="secondary" className="ml-1 sm:ml-2">
                      {invoiceData.lineItems.length} {invoiceData.lineItems.length === 1 ? "item" : "items"}
                    </Badge>
                  </span>
                  <Button onClick={addLineItem} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="space-y-3 sm:space-y-4">
                  {invoiceData.lineItems.map((item, index) => (
                    <div key={item.id} className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                      <div className="grid gap-3 sm:gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                            placeholder="Service or product description"
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Quantity</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(item.id, "quantity", Number.parseFloat(e.target.value) || 0)
                              }
                              min="0"
                              step="0.1"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Rate </Label>
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateLineItem(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Amount</Label>
                            <div className="flex items-center gap-1 sm:gap-2 mt-1">
                              <Input
                                value={`${Number(item.amount || 0).toFixed(2)}`}
                                readOnly
                                className="bg-gray-100 font-medium"
                              />
                              {invoiceData.lineItems.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeLineItem(item.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Payment terms, additional notes, or special instructions..."
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="lg:sticky lg:top-4">
            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-2 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl">Invoice Preview</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 sm:gap-2">
                    <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                    Print
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownload}
                    className="gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700"
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8" id="invoice-preview">
                <div ref={invoiceRef}>
                  {/* Invoice Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-0">
                      {invoiceData.companyLogo && (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-gray-200 shadow-md flex-shrink-0">
                          <img
                            src={invoiceData.companyLogo || "/placeholder.svg"}
                            alt="Company Logo"
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        </div>
                      )}
                      <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">INVOICE</h1>
                        <p className="text-gray-600 font-medium">#{invoiceData.invoiceNumber}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Date:</span> {new Date(invoiceData.date).toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-medium">Due:</span> {new Date(invoiceData.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Company and Client Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm uppercase tracking-wide">
                        From:
                      </h3>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p className="font-semibold text-base">{invoiceData.companyName || "Your Company"}</p>
                        <p className="whitespace-pre-line leading-relaxed">{invoiceData.companyAddress}</p>
                        {invoiceData.companyEmail && <p className="text-blue-600">{invoiceData.companyEmail}</p>}
                        {invoiceData.companyPhone && <p>{invoiceData.companyPhone}</p>}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm uppercase tracking-wide">To:</h3>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p className="font-semibold text-base">{invoiceData.clientName || "Client Name"}</p>
                        <p className="whitespace-pre-line leading-relaxed">{invoiceData.clientAddress}</p>
                        {invoiceData.clientEmail && <p className="text-blue-600">{invoiceData.clientEmail}</p>}
                        {invoiceData.clientPhone && <p>{invoiceData.clientPhone}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="mb-6 sm:mb-8 overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-2 sm:py-3 font-semibold text-gray-900 text-sm uppercase tracking-wide">
                            Description
                          </th>
                          <th className="text-right py-2 sm:py-3 font-semibold text-gray-900 w-16 sm:w-20 text-sm uppercase tracking-wide">
                            Qty
                          </th>
                          <th className="text-right py-2 sm:py-3 font-semibold text-gray-900 w-20 sm:w-24 text-sm uppercase tracking-wide">
                            Rate
                          </th>
                          <th className="text-right py-2 sm:py-3 font-semibold text-gray-900 w-20 sm:w-24 text-sm uppercase tracking-wide">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.lineItems.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100">
                            <td className="py-3 sm:py-4 text-gray-700">{item.description || "Service description"}</td>
                            <td className="py-3 sm:py-4 text-right text-gray-700">{item.quantity}</td>
                            <td className="py-3 sm:py-4 text-right text-gray-700">
                              ${Number(item.rate || 0).toFixed(2)}
                            </td>
                            <td className="py-3 sm:py-4 text-right text-gray-700 font-medium">
                              ${Number(item.amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end mb-6 sm:mb-8">
                    <div className="w-full sm:w-64 md:w-72 space-y-2">
                      <div className="flex justify-between py-2 text-gray-700">
                        <span>Subtotal:</span>
                        <span className="font-medium">{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 text-gray-700">
                        <span>Tax ({invoiceData.taxRate}%):</span>
                        <span className="font-medium">{taxAmount.toFixed(2)}</span>
                      </div>
                      <Separator className="my-2 sm:my-3" />
                      <div className="flex justify-between py-2 text-base sm:text-lg font-bold text-gray-900">
                        <span>Total:</span>
                        <span>{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {invoiceData.notes && (
                    <div className="border-t border-gray-200 pt-4 sm:pt-6">
                      <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm uppercase tracking-wide">
                        Notes:
                      </h3>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{invoiceData.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
