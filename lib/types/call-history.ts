import { Database } from '@/lib/database.types'

export type CallHistory = Database['public']['Tables']['call_history']['Row'] & {
  caller: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
  receiver: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
}