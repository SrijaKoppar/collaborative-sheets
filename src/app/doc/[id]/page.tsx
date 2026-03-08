import Spreadsheet from "@/components/Spreadsheet"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const { id } = await params

  return (
    <div className="p-6">
      <Spreadsheet docId={id} />
    </div>
  )
}