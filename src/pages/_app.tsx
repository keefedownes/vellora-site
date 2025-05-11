import type { AppProps } from "next/app";
import "../styles/globals.css"; // ✅ Add this line

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
