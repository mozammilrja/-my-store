export const getBaseURL = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "production" ? "https://everwear.com" : "http://localhost:8001")
}
