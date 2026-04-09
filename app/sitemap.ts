import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://goofy-bird.vercel.app/' // ⚠️ เปลี่ยนเป็นโดเมนจริงของบอส

  return [
    {
      url: `${baseUrl}`, 
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },

  ]
}