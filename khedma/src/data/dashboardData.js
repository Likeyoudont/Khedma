export const clientData = {
  requests: [
    { id: 1, service: 'plumbing', workerName: 'Youssef Amrani', status: 'pending' },
  ],
  currentJob: {
    id: 2,
    service: 'electricity',
    workerName: 'Youssef Amrani',
    status: 'confirmed',
    price: 250,
    eta: '20 min',
  },
  previousJobs: [
    { id: 3, service: 'cleaning', workerName: 'Khadija Bennani', status: 'completed', price: 150 },
  ],
  reviews: [
    { id: 1, jobService: 'cleaning', rating: 5, commentKey: 'dashboard.sampleReview' },
  ],
  history: {
    jobsCompleted: 12,
    cancellations: 1,
  },
}

export const workerData = {
  requests: [
    { id: 1, service: 'plumbing', clientName: 'Sara Alaoui', status: 'pending', expiresInSeconds: 300, clientProposedPrice: 100 },
  ],
  pendingOffers: [
    { id: 2, service: 'electricity', clientName: 'Hassan Idrissi', proposedPrice: 200 },
  ],
  acceptedJobs: [
    { id: 3, service: 'painting', clientName: 'Fatima Zahra', status: 'in_progress', price: 400 },
  ],
  reviews: [
    { id: 1, clientName: 'Sara', rating: 5, commentKey: 'dashboard.workerReview' },
  ],
  history: {
    jobsCompleted: 34,
    cancellations: 0,
  },
}

export const announcements = [
  {
    id: 1,
    service: 'plumbing',
    location: 'Salé',
    clientName: 'Sara Alaoui',
    detailsKey: 'announcementOne',
    postedAt: '10:30',
  },
  {
    id: 2,
    service: 'electricity',
    location: 'Rabat',
    clientName: 'Hassan Idrissi',
    detailsKey: 'announcementTwo',
    postedAt: '11:15',
  },
  {
    id: 3,
    service: 'cleaning',
    location: 'Casablanca',
    clientName: 'Imane Bennis',
    detailsKey: 'announcementThree',
    postedAt: '12:05',
  },
]

