export const statusLabels = {
  pending: "In attesa",
  confirmed: "Confermata",
  declined: "Rifiutata",
  cancelled: "Annullata",
  completed: "Completata",
};

export const statusTransitions = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["pending", "completed", "cancelled"],
  declined: ["pending"],
  cancelled: ["pending"],
  completed: [],
};
