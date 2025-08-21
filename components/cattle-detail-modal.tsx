"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface CattleData {
  id: string
  marca_fogo: string
  brinco_eletronico: string | null
  sexo: "Macho" | "Fêmea"
  origem: string | null
  status_reproducao: "Prenha" | "Vazia" | "Não se aplica"
  data_nascimento: string | null
  data_entrada: string
  data_saida: string | null
  valor_compra: number | null
  valor_venda: number | null
  ativo: boolean
  fazendas: { nome: string } | null
  lotes: { nome: string } | null
  pesagens: { peso: number; data_pesagem: string }[]
}

interface CattleDetailModalProps {
  animal: CattleData
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

export function CattleDetailModal({ animal, open, onClose, onUpdate }: CattleDetailModalProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const sortedWeighings = animal.pesagens.sort(
    (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes do Animal - {animal.marca_fogo}
            <Badge variant={animal.ativo ? "default" : "secondary"}>{animal.ativo ? "Ativo" : "Inativo"}</Badge>
          </DialogTitle>
          <DialogDescription>Informações completas e histórico de pesagens</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identificação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marca a Fogo:</span>
                <span className="font-medium">{animal.marca_fogo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brinco Eletrônico:</span>
                <span className="font-medium">{animal.brinco_eletronico || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sexo:</span>
                <Badge variant={animal.sexo === "Macho" ? "default" : "secondary"}>{animal.sexo}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Origem:</span>
                <span className="font-medium">{animal.origem || "-"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fazenda:</span>
                <span className="font-medium">{animal.fazendas?.nome || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lote/Pasto:</span>
                <span className="font-medium">{animal.lotes?.nome || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status Reprodutivo:</span>
                <Badge variant="outline">{animal.status_reproducao}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Datas Importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de Nascimento:</span>
                <span className="font-medium">{formatDate(animal.data_nascimento)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de Entrada:</span>
                <span className="font-medium">{formatDate(animal.data_entrada)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de Saída:</span>
                <span className="font-medium">{formatDate(animal.data_saida)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Financeiras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor de Compra:</span>
                <span className="font-medium">{formatCurrency(animal.valor_compra)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor de Venda:</span>
                <span className="font-medium">{formatCurrency(animal.valor_venda)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Histórico de Pesagens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Pesagens</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedWeighings.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedWeighings.map((pesagem, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(pesagem.data_pesagem)}</TableCell>
                        <TableCell className="font-medium">{pesagem.peso} kg</TableCell>
                        <TableCell className="text-muted-foreground">{(pesagem as any).observacoes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nenhuma pesagem registrada</div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
