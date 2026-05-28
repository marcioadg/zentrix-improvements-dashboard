import React from 'react';
import { Helmet } from 'react-helmet';

interface SchemaMarkupProps {
  schemas: Array<Record<string, any>>;
}

export const SchemaMarkup: React.FC<SchemaMarkupProps> = ({ schemas }) => {
  return (
    <Helmet>
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
