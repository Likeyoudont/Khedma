// Real production builds use Laravel accounts/jobs. Developer practice stays
// available locally and in the explicitly labelled GitLab Pages preview.
export const demosEnabled = import.meta.env.DEV || import.meta.env.VITE_STATIC_PREVIEW === 'true' || import.meta.env.VITE_ENABLE_DEMO === 'true'
