import { useState } from "react";
//import { useNews } from "../../components/News/use-news";
import WidgetPane from "../../components/WidgetPane";


// Bestemmer hva en news article ser ut som; her tenker vi kun på tittel og url

type NewsArticle = {
  title: string;
  url: string;
};


export default function NewsWidget() {

 
  const [country, setCountry] = useState("");                   // Lagrer landkoden brukeren skriver inn. F.eks. "no", "us", "gb"
  const [articles, setArticles] = useState<NewsArticle[]>([]);  // Lagrer nyhetsartiklene vi henter fra API-et.
  const [loading, setLoading] = useState(false);                // Brukes til å vise "Loading..." mens vi henter data.



  // Henter nyheter fra World News API: 


  async function fetchNewsByCountry(country: string) {

    console.log("Fetching news for:", country);

    setLoading(true);

    try {

      // Sender forespørsel til WorldNewsAPI.

      const res = await fetch(
        `https://api.worldnewsapi.com/search-news?source-countries=${country}`,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_WORLD_NEWS_API_KEY // API-nøkkelen skal ligge i .env-fil.
          }
        }
      );

     
      const data = await res.json();  // Gjør om til JSON

      const mapped = (data.news || []).map((article: any) => ({
        title: article.title,
        url: article.url
      }));

      setArticles(mapped); // Lagrer artiklene slik at React kan vise dem

    } catch (err) {
      console.error("News fetch failed:", err);
    }

    setLoading(false);
  }



  function handleSubmit() {
    if (!country) return;
    fetchNewsByCountry(country);
  }


  
  // Selve widget-layouten. Bruker WidgetPane for felles styling.

  return (
    <WidgetPane title="World News">

      <input
        type="text"
        placeholder="Country code (no, us, gb...)"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />

      <button onClick={handleSubmit}>
        Get Headlines
      </button>

      {loading && <p>Loading...</p>}

      {articles.map((article, i) => (
        <a key={i} href={article.url} target="_blank">
          {article.title}
        </a>
      ))}

    </WidgetPane>
  );

  
}


// Funksjon for å teste om api-kallet fungerer; skjekker i konsollet i browser 

export async function testFetchNews(country: string) {
  try {
    const res = await fetch(
      `https://api.worldnewsapi.com/search-news?source-countries=${country}`,
      {
        headers: {
          "x-api-key": import.meta.env.VITE_WORLD_NEWS_API_KEY
        }
      }
    );

    const data = await res.json();

    const mapped = (data.news || []).map((article: any) => ({
      title: article.title,
      url: article.url
    }));

    console.log("Test result:", mapped);

    return mapped;

  } catch (err) {
    console.error("Test failed:", err);
  }
}
