import { type CommandItem } from "../command/command.types"

import { type Tag, type TagAssignment } from "./tags.types"

export function tagAssignmentsToCommandItems(
  assignments: TagAssignment[],
  tags: Tag[],
): CommandItem[] {
  const items: CommandItem[] = []

  for (const assignment of assignments) {
    const activeTagIds = new Set(assignment.tagIds)

    for (const tag of tags) {
      const isAssigned = activeTagIds.has(tag.id)

      items.push({
        id: `tag-add-${assignment.fileId}-${tag.id}`,
        title: `Add/Remove ${tag.label}`,
        subtitle: isAssigned ? "Currently assigned" : "Not assigned",
        keywords: [
          "tag",
          tag.label,
          "add",
          "remove",
          assignment.fileId,
          isAssigned ? "assigned" : "unassigned",
        ],
        group: "actions",
        scope: "folder",
        entityId: assignment.fileId,
        payload: {
          fileId: assignment.fileId,
          tagId: tag.id,
          assigned: isAssigned,
          color: tag.color,
        },
      })
    }
  }

  return items.sort((a, b) => a.id.localeCompare(b.id))
}
