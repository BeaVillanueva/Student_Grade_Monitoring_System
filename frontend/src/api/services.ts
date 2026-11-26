import { apiClient, type ApiTransport } from "./client.ts";
import { createAuthService } from "./auth.ts";
import { createSubjectsService } from "./subjects.ts";
import { createEnrollmentsService } from "./enrollments.ts";
import { createGradesService } from "./grades.ts";
import { createInquiriesService } from "./inquiries.ts";
import { createUsersService } from "./users.ts";
import { createDirectoryService } from "./directory.ts";
export function createServices(transport: ApiTransport = apiClient) {
  return {
    auth: createAuthService(transport),
    subjects: createSubjectsService(transport),
    enrollments: createEnrollmentsService(transport),
    grades: createGradesService(transport),
    inquiries: createInquiriesService(transport),
    users: createUsersService(transport),
    directory: createDirectoryService(transport),
  };
}
