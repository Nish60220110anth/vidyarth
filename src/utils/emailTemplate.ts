import { NOTIFICATION_TYPE } from "@prisma/client";

type TemplateTypes = NOTIFICATION_TYPE;

const subjectTemplates: Record<TemplateTypes, string> = {
  SHORTLIST: `{{company_full}} - {{role}} Shortlist Published!`,
  COMPANY: `{{company_full}} Has Been Added in Vidyarth`,
  COMPANY_CONTENT: `{{company_full}} Content Has Been Updated`,
  CV_PREP: `CV Preparation Section Is Updated`,
  DOMAIN_PREP: `{{domain}} Preparation Section Is Updated`,
  CUSTOM: ``
};

const briefTemplate: Record<TemplateTypes, string> = {
  SHORTLIST: `You have been shortlisted for {{company_full}} - {{role}}. Please review the links provided and prepare accordingly.`,
  COMPANY: `{{company_full}} has been added to the Vidyarth. Review company details and start preparing.`,
  COMPANY_CONTENT: `New content has been added to the {{company_full}} section. Check it out and stay updated.`,
  CV_PREP: `The CV preparation section has been updated. Please review the new resources.`,
  DOMAIN_PREP: `The preparation materials for the {{domain}} domain have been updated. Please review them at the earliest.`,
  CUSTOM: ``
};

// Core content bodies (inserted into wrapper)
const contentBodies: Record<TemplateTypes, string> = {
  SHORTLIST: `You have been shortlisted for <strong>{{company_full}}</strong> for the role of <strong>{{role}}</strong>. This is an important opportunity, and you are expected to treat it with utmost seriousness and urgency.<br><br>Refer to the following links to proceed with your preparation and review all necessary details without delay.`,
  COMPANY: `Please be informed that <strong>{{company_full}}</strong> has now been added to the Vidyarth portal. All students are expected to thoroughly review the company details and familiarize themselves with the available material.`,
  COMPANY_CONTENT: `The <strong>{{company_full}}</strong> section has been updated with new content on <strong>{{updated_at}}</strong>. You are expected to stay current with all relevant company information and materials.`,
  CV_PREP: `The CV preparation section has been updated with new resources as of <strong>{{updated_at}}</strong>. All students are expected to review the updated content and prepare their CVs accordingly.`,
  DOMAIN_PREP: `The <strong>{{domain}}</strong> domain preparation section has been updated with new resources as of <strong>{{updated_at}}</strong>. All students associated with this domain are expected to review the updated content without delay.`,
  CUSTOM: ``
};

// Link section renderer
function renderLinksSection(links: { name: string; url: string }[]) {
  if (!links?.length) return '';
  const items = links
    .map(link => `<li><a href="${link.url}" style="color: #00bcd4; text-decoration: none;">${link.name}</a></li>`)
    .join('');
  return `
    <tr>
      <td style="font-size: 15px; padding-top: 10px;">
        <strong>Relevant Links:</strong>
        <ul style="padding-left: 20px; margin-top: 5px; font-size: 15px;">
          ${items}
        </ul>
      </td>
    </tr>`;
}

// Full dark-themed responsive wrapper
function wrapDarkResponsive(content: string, linksSection: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 15px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; background-color: #0d1b24; font-family: Arial, sans-serif; color: #e0f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 30px 0;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #121f28; border-radius: 12px; padding: 30px; color: #e0f7fa; width: 600px;">
          
          <!-- Greeting -->
          <tr>
            <td style="font-size: 16px; padding-bottom: 20px;">
              Hi <strong>{{pcom_id}} - {{name}}</strong>,
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="font-size: 15px; padding-left: 20px; line-height: 1.6;">
              ${content}
            </td>
          </tr>

          <!-- Links -->
          ${linksSection}

          <!-- Reminder -->
          <tr>
            <td style="font-size: 15px; padding-top: 15px;">
              You are expected to review the materials thoroughly. No further communication will be sent regarding this update, unless deemed necessary.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 20px; font-size: 14px; color: #90a4ae;">
              Regards,<br />
              <strong style="color: #00bcd4;">Placement Systems</strong>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Replace {{placeholders}} with actual values
export function renderTemplate(source: string, variables: Record<string, string>) {
  let html = source;
  for (const key in variables) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
  }
  return html;
}

// Subject generator
export function renderSubjectTemplate(type: TemplateTypes, variables: Record<string, string>) {
  return renderTemplate(subjectTemplates[type], variables);
}

// Brief message generator
export function renderBriefTemplate(type: TemplateTypes, variables: Record<string, string>) {
  return renderTemplate(briefTemplate[type], variables);
}

// Final full-body email HTML generator (dark, responsive)
export function renderBodyTemplate(
  type: TemplateTypes,
  variables: Record<string, string>,
  links: { name: string; url: string }[] = []
) {
  const content = renderTemplate(contentBodies[type], variables);
  const linksSection = renderLinksSection(links);
  return renderTemplate(wrapDarkResponsive(content, linksSection), variables);
}
