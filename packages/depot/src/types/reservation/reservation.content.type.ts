export interface IReservationContent {
  id: number;
  description: string;
  innerParticipantNumber: number;
  outerParticipantNumber: number;
  food: string;
  busking: boolean;
  workerNeed: boolean;
  workerId: number;
  performance: boolean;
}

export type IReservationContentCreate = Omit<IReservationContent, "id" | "workerId" | "performance"> & {
  performance?: boolean;
};