import { useEffect } from "react";

interface YandexMetrikaProps {
  id?: string;
}

// Declare global ym function
declare global {
  interface Window {
    ym: (id: number, method: string, params?: Record<string, any>) => void;
  }
}

const YandexMetrika: React.FC<YandexMetrikaProps> = ({ id }) => {
  const metrikaId = id || import.meta.env.VITE_YANDEX_METRIKA_ID;

  useEffect(() => {
    // Only load in production and when ID is provided
    if (!metrikaId || import.meta.env.DEV) {
      return;
    }

    const numericId = parseInt(metrikaId, 10);

    if (isNaN(numericId)) {
      console.warn("Invalid Yandex Metrika ID");
      return;
    }

    // Check if already loaded
    if (window.ym && typeof window.ym === "function") {
      return;
    }

    // Load Yandex Metrika script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

      ym(${numericId}, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true
      });
    `;

    document.head.appendChild(script);

    // Add noscript fallback
    const noscript = document.createElement("noscript");
    noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${numericId}" style="position:absolute; left:-9999px;" alt="" /></div>`;
    document.head.appendChild(noscript);

    // Cleanup function
    return () => {
      // Remove script and noscript elements on unmount
      document.head.removeChild(script);
      document.head.removeChild(noscript);
    };
  }, [metrikaId]);

  return null; // This component doesn't render anything
};

export default YandexMetrika;
