export default ({ env }) => ({
  comments: {
    enabled: true,

    config: {
      enabledCollections: ["api::joke.joke", "api::page.page"],
      badWords: false,
      moderatorRoles: ["Authenticated"],
      approvalFlow: ["api::page.page"],
      entryLabel: {
        "*": ["Title", "title", "Name", "name", "Subject", "subject"],
        "api::page.page": ["MyField"],
      },
      blockedAuthorProps: ["name", "email"],
      reportReasons: {
        MY_CUSTOM_REASON: "MY_CUSTOM_REASON",
      },
      gql: {
        // ...
      },
    },
  },
  graphql: {
    enabled: true,
  },
  email: {
    config: {
      provider: 'strapi-provider-email-resend',
      providerOptions: {
        apiKey: env('RESEND_API_KEY'), // Required
      },
      settings: {
        defaultFrom: 'no-reply@emails.f6sny.com',
        defaultReplyTo: 'no-reply@emails.f6sny.com',
      },
    }
  },
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env('HETZNER_ACCESS_KEY_ID'),
            secretAccessKey: env('HETZNER_ACCESS_SECRET'),
          },
          region: env('HETZNER_REGION'), // e.g "fr-par"
          endpoint: env('HETZNER_ENDPOINT'), // e.g. "https://s3.fr-par.scw.cloud"
          params: {
            Bucket: env('HETZNER_BUCKET'),
          },
        },
      },
    },
  },
});
