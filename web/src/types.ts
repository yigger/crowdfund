export type Campaign = {
  id: bigint
  owner: string
  title: string
  description: string
  target: bigint
  deadline: bigint
  amountCollected: bigint
  image: string
  donators: string[]
  donations: bigint[]
}
