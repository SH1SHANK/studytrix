export type CourseType = "core" | "elective" | "lab";

export interface Course {
  courseCode: string;
  courseName: string;
  driveFolderId: string;
  credits: number;
  courseType: CourseType;
}

export interface CatalogResponse {
  courses: Course[];
}
