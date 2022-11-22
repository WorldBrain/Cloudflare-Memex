export type SharedListTimestamp = [string, number]

export interface SharedListTimestampSetRequest {
    sharedListTimestamps: SharedListTimestamp[]
}

export interface SharedListTimestampGetRequest {
    sharedListIds: string[]
}
