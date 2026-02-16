export interface Tag {
  id: string
  label: string
  color: string
}

export interface TagAssignment {
  fileId: string
  tagIds: string[]
}
