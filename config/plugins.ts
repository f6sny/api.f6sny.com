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
    }
});
