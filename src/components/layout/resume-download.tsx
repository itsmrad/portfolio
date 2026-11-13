import { site } from "@/content/site";
import { resumePdf } from "@/lib/resume";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/ui/icons";

/** The resume download button. Renders nothing while the PDF is absent, so there is never a dead link. */
export function ResumeDownload({ className }: { className?: string }) {
  const resume = resumePdf();
  if (!resume) return null;
  return (
    <Button asChild className={className}>
      <a href={resume} download={site.resume.fileName}>
        <DownloadIcon className="size-3.5" />
        Download resume
      </a>
    </Button>
  );
}
