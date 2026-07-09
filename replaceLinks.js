const fs = require('fs');
const glob = require('glob');

// Use glob inside the script to find all files
const files = glob.sync('src/**/*.js');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace <Link href={`/profile/...`} to <a href={`/profile/...`}
  // We need to match <Link and </Link> strictly for dynamic routes.
  content = content.replace(/<Link\s+href=\{`\/(profile|challenges|clubs)\/\$\{([^}]+)\}`\}/g, '<a href={`/$1/${$2}`}');
  content = content.replace(/<\/Link>/g, '</a>');
  
  // What if it's <Link href={`/profile/${...}`} >
  // Then we replaced <Link with <a, we can keep the rest.
  
  // Wait, the above replaces all </Link> with </a> in the entire file!!
  // That would break static links like <Link href="/feed"> !
}
