const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
const isApkOnly = /\[apk\]/i.test(commitMessage) && !/\[(web|ambos)\]/i.test(commitMessage);

if (isApkOnly) {
  console.log("Commit marcado somente para APK; deploy web ignorado.");
  process.exit(0);
}

console.log("Commit destinado à web (ou compartilhado); deploy Vercel continuará.");
process.exit(1);
