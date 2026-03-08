export default function Presence({users}:any){

  return(
    <div className="flex gap-2 mb-3">

      {users.map((u:any,i:number)=>(
        <div
          key={i}
          className="px-2 py-1 text-xs text-white rounded"
          style={{background:u.color}}
        >
          {u.name}
        </div>
      ))}

    </div>
  )
}