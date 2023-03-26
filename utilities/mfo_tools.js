const slug = require('slugify');

const strip_tags_and_new_lines = (text) => {
  if (!text) return false;
  text = text.toString();
  return text.replace(/<\/?[^>]+>|[\r\n]/g, '');
};

const shorten = (text, maxLen, separator = ' ') => {
  if (text.length <= maxLen) return str;
  if (typeof separator !== 'string' || separator.length === 0) {
      throw new Error('Invalid separator argument: must be a non-empty string');
  }
  return text.substr(0, text.lastIndexOf(separator, maxLen));
};

const allowed_characters_regex = /[^- \\\\1234567890أبجدهوزحطيكلمنسعفصقرشتثخذضظغلاإآؤئءىةاabcdefghijklmnopqrstuvwxyz.\\+!#\\?]/g;

const generate_slug = (text) =>{
  slug = strip_tags_and_new_lines(text);
  slug = slug.replace(/ +(?= )/g,'');
  slug = slug.trim();
  slug = slug.replace("يقول لك","");
  slug = slug.replace(allowed_characters_regex, "");
  slug = slug.trim();
  slug = shorten(slug, 50).trim().replace(/[" "]/g, "-");
  return slug
};

module.exports = generate_slug;