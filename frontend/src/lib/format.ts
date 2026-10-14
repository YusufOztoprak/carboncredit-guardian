export const shortAddr = (a?: string) =>
  a && a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a ?? "";

export const formatDate = (value?: string) => {
  if (!value) return "";
  const d = isNaN(Number(value)) ? new Date(value) : new Date(Number(value) * 1000);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
};