import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nome: string
          email: string
          telefone: string | null
          empresa: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          telefone?: string | null
          empresa?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          telefone?: string | null
          empresa?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fazendas: {
        Row: {
          id: string
          nome: string
          endereco: string | null
          proprietario: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          endereco?: string | null
          proprietario?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          endereco?: string | null
          proprietario?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      lotes: {
        Row: {
          id: string
          fazenda_id: string
          nome: string
          area_hectares: number | null
          capacidade_animais: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fazenda_id: string
          nome: string
          area_hectares?: number | null
          capacidade_animais?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fazenda_id?: string
          nome?: string
          area_hectares?: number | null
          capacidade_animais?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      gado: {
        Row: {
          id: string
          fazenda_id: string
          lote_id: string | null
          marca_fogo: string
          brinco_eletronico: string | null
          sexo: "Macho" | "Fêmea"
          origem: string | null
          status_reproducao: "Prenha" | "Vazia" | "Não se aplica"
          data_nascimento: string | null
          pai_id: string | null
          mae_id: string | null
          data_entrada: string
          data_saida: string | null
          motivo_saida: string | null
          valor_compra: number | null
          valor_venda: number | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fazenda_id: string
          lote_id?: string | null
          marca_fogo: string
          brinco_eletronico?: string | null
          sexo: "Macho" | "Fêmea"
          origem?: string | null
          status_reproducao?: "Prenha" | "Vazia" | "Não se aplica"
          data_nascimento?: string | null
          pai_id?: string | null
          mae_id?: string | null
          data_entrada?: string
          data_saida?: string | null
          motivo_saida?: string | null
          valor_compra?: number | null
          valor_venda?: number | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fazenda_id?: string
          lote_id?: string | null
          marca_fogo?: string
          brinco_eletronico?: string | null
          sexo?: "Macho" | "Fêmea"
          origem?: string | null
          status_reproducao?: "Prenha" | "Vazia" | "Não se aplica"
          data_nascimento?: string | null
          pai_id?: string | null
          mae_id?: string | null
          data_entrada?: string
          data_saida?: string | null
          motivo_saida?: string | null
          valor_compra?: number | null
          valor_venda?: number | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pesagens: {
        Row: {
          id: string
          gado_id: string
          peso: number
          data_pesagem: string
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          gado_id: string
          peso: number
          data_pesagem?: string
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          gado_id?: string
          peso?: number
          data_pesagem?: string
          observacoes?: string | null
          created_at?: string
        }
      }
    }
  }
}
