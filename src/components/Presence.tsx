import { UserPresence } from "@/types/spreadsheet"

interface PresenceProps {
  users: UserPresence[]
}

export default function Presence({users}: PresenceProps){

  return(
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {users.length} {users.length === 1 ? 'user' : 'users'}
      </span>

      <div className="flex -space-x-2">
        {users.map((u, i)=>(
          <div
            key={u.id ?? i}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-semibold border-2 border-white shadow-sm hover:z-10 transition-transform hover:scale-110 cursor-pointer"
            style={{background:u.color}}
            title={u.name}
          >
            {u.name[0].toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  )
}
