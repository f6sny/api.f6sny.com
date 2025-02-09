# F6sny.com

This is the front-end portion of the project which aims to provide a database of Arabic (mostly Saudi) jokes in text format, no images. The backend is a Strapi instance that serves from a mariadb database.

## Features

- Community based posting and moderation, with slight administrative intervention.
  Visitors, without registration can post jokes into the platform. These jokes will go into pending status which can be viewed by other visitiors in the moderation page. jokes get published once they reach certain threshold of up votes, or funny votes. since submission might be offensive, not funny, or not even jokes. Community may vote negatively on the post so once it reaches certain threshold of negative votes, it will be soft-deleted into the database and removed from pending state.
- Sensitive content administration
  By default, all sensitive jokes are censored, unless the visitor or user opts-out of this restriction to avoid exposing prophanity or unwanted terminilogies to kids and people that do not prefer this kind of jokes. This preference is saved into session, and submitted with each request to the API, by default, the API will not serve this content.
  The mechanism followed for this approach is to have jokes, and tags, tags may be marked with an attribute `safe_content_preference` open or closed. if closed, it means it is not safe content, thus, the jokes that have this tag, will not be presented by default.
- Flood Protection
  On moderation, unique identifiers will be saved for each visitor, including, screen dimensions, ip address ...etc. to protect against duplicate voting on the same joke.
- Arabic strings clean-up.
  Strings that have unnecessary repetitive characters, or have unnecessary tashkeel, will be sanitized so the pure string is used.
- Auto profanity detection.
  Jokes that contain certain words will be automatically flagged with the safe_content_preference closed tag, which is for now called "+18". Thus, they will be hidden by default.
- Reporting.
  Visitors or users may report jokes for being too aggressive or offensive, for admins to evaluate.
- Comments.
  Visitors and users may comment on jokes on the platform, for registerd users, the information will be auto-populated, for visitors, the email and nickname will be required, if joke email address was not verified, an unverified tag will be added to the user info.
- User Registration.
  Registered users will have their prefernces preserved across logins and they will have all their submitted jokes attributed to their account. So, a users page, will have his jokes presented to the visitor, and there will be a tab for his comments.