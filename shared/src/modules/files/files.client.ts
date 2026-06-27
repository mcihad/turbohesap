import type { AxiosInstance } from 'axios'

import { joinUrl } from '../../core/http'
import type { FileDto, UpdateFileRequest } from './file.dto'
import type { IFilesService } from './files.service'

// Axios implementation → /api/files. Upload posts multipart FormData; the browser
// / RN runtime sets the multipart boundary, so we leave Content-Type unset.
export class FilesApiClient implements IFilesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(entityType: string, entityId: string): Promise<FileDto[]> {
    return (
      await this.http.get<FileDto[]>('/files', { params: { entityType, entityId } })
    ).data
  }

  async get(id: string): Promise<FileDto> {
    return (await this.http.get<FileDto>(`/files/${id}`)).data
  }

  async upload(form: FormData): Promise<FileDto[]> {
    return (
      await this.http.post<FileDto[]>('/files', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data
  }

  async update(id: string, input: UpdateFileRequest): Promise<FileDto> {
    return (await this.http.patch<FileDto>(`/files/${id}`, input)).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/files/${id}`)
  }

  rawUrl(storedName: string): string {
    const base = this.http.defaults.baseURL ?? '/api'
    return joinUrl(base, `files/raw/${storedName}`)
  }
}
