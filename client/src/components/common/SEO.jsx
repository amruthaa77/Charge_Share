import React from 'react';
import { Helmet } from 'react-helmet-async';

export const SEO = ({
  title,
  description = 'ChargeShare India - Bengaluru’s premier peer-to-peer EV charging community. Discover neighborhood 16A electric two-wheeler and scooter chargers, book instantly, and pay securely.',
  canonical,
  image = '/og-image.png',
  type = 'website',
  schemaData = null,
  noindex = false,
}) => {
  const siteUrl = 'https://chargeshare.in';
  const fullTitle = title ? `${title} | ChargeShare India` : 'ChargeShare India | Peer-to-Peer EV Charging in Bengaluru';
  const currentUrl = canonical ? `${siteUrl}${canonical}` : siteUrl;

  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'ChargeShare India',
    description: 'Peer-to-peer EV charging marketplace in Bengaluru, Karnataka',
    url: siteUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '100ft Road, Indiranagar',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      postalCode: '560038',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '12.9716',
      longitude: '77.5946',
    },
    areaServed: 'Bengaluru, Karnataka, India',
    priceRange: '₹₹',
  };

  return (
    <Helmet>
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {/* Basic metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={currentUrl} />

      {/* OpenGraph */}
      <meta property="og:site_name" content="ChargeShare India" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={`${siteUrl}${image}`} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${image}`} />

      {/* Structured JSON-LD Data */}
      <script type="application/ld+json">
        {JSON.stringify(schemaData || defaultSchema)}
      </script>
    </Helmet>
  );
};
