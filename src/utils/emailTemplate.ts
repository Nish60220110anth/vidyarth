import { NOTIFICATION_TYPE } from "@prisma/client";

type TemplateTypes = NOTIFICATION_TYPE;

const subjectTemplates: Record<TemplateTypes, string> = {
    SHORTLIST: `{{company_full}} - {{role}} Shortlist Published!`,
    COMPANY: `{{company_full}} Has Been Added in Vidyarth`,
    CONTENT: `{{company_full}} Content Has Been Updated`,
    PREP: `{{domain}} Preparation Section Is Updated`,
    CUSTOM: ``
}

const briefTemplate: Record<TemplateTypes, string> = {
  SHORTLIST: `You have been shortlisted for {{company_full}} - {{role}}. Please review the links provided and prepare accordingly.`,
  COMPANY: `{{company_full}} has been added to the Vidyarth portal. Review company details and start preparing.`,
  CONTENT: `New content has been added to the {{company_full}} section. Check it out and stay updated.`,
  PREP: `The preparation materials for the {{domain}} domain have been updated. Please review them at the earliest.`,
  CUSTOM: ``
};

const bodyTemplates: Record<TemplateTypes, string> = {
  SHORTLIST: `
<table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa; padding: 30px;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 10px; padding: 30px; font-family: Arial, sans-serif; color: #333333;">

        <!-- Greeting -->
        <tr>
          <td style="font-size: 16px; padding-bottom: 20px;">
            Hi <strong>{{pcom_id}} - {{name}}</strong>,
          </td>
        </tr>

        <!-- Shortlist Info -->
        <tr>
          <td style="font-size: 15px; padding-bottom: 15px; padding-left: 20px;">
            You have been shortlisted for <strong>{{company_full}}</strong> for the role of <strong>{{role}}</strong>. This is an important opportunity, and you are expected to treat it with utmost seriousness and urgency.
          </td>
        </tr>

        <!-- Instruction -->
        <tr>
          <td style="font-size: 15px; padding-bottom: 10px;">
            Refer to the following links to proceed with your preparation and review all necessary details without delay:
          </td>
        </tr>

        <!-- Chitragupta Link -->
        <tr>
          <td style="padding-bottom: 10px;">
            <strong>Shortlist Link (Chitragupta):</strong><br />
            <a href="{{chitragupta_link}}" style="color: #007bff; text-decoration: underline; font-weight: 500;">{{chitragupta_link_name}}</a>
          </td>
        </tr>

        <!-- Resource Links -->
        <tr>
          <td style="font-size: 15px; padding-top: 10px;">
            <strong>Resources in Vidyarth:</strong>
            <ul style="padding-left: 20px; margin-top: 5px; font-size: 15px;">
              <li><a href="{{company_link}}" style="color: #007bff; text-decoration: underline; font-weight: 500;">{{company_link_name}}</a></li>
              <li><a href="{{my_section_link}}" style="color: #007bff; text-decoration: underline; font-weight: 500;">{{my_section_link_name}}</a></li>
            </ul>
          </td>
        </tr>

        <!-- Final Instruction -->
        <tr>
          <td style="font-size: 15px; padding-top: 15px;">
            You are expected to review these resources thoroughly. No further communication will be sent regarding this update, unless deemed necessary
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top: 20px; font-size: 14px; color: #666666;">
            Regards,<br />
            <strong>Placement Systems</strong>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`,

  COMPANY: `
<table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa; padding: 30px;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 10px; padding: 30px; font-family: Arial, sans-serif; color: #333333;">

        <tr>
          <td style="font-size: 16px; padding-bottom: 20px;">
            Hi <strong>{{pcom_id}} - {{name}}</strong>,
          </td>
        </tr>

        <tr>
          <td style="font-size: 15px; padding-bottom: 15px; padding-left: 20px;">
            Please be informed that <strong>{{company_full}}</strong> has now been added to the Vidyarth portal. All students are expected to thoroughly review the company details and familiarize themselves with the available material.
          </td>
        </tr>

        <tr>
          <td style="font-size: 15px; padding-bottom: 15px;">
            You are advised to begin your preparation without delay. No further reminders will be issued regarding this update.
          </td>
        </tr>

        <tr>
          <td style="font-size: 15px;">
            <strong>Access the following resources:</strong>
            <ul style="padding-left: 20px; margin-top: 5px; font-size: 15px;">
              <li><a href="{{company_link}}" style="color: #007bff; text-decoration: underline; font-weight: 500;">{{company_link_name}}</a></li>
            </ul>
          </td>
        </tr>

        <tr>
          <td style="padding-top: 20px; font-size: 14px; color: #666666;">
            Regards,<br />
            <strong>Placement Systems</strong>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`,

  CONTENT: `
<table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa; padding: 30px;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 10px; padding: 30px; font-family: Arial, sans-serif; color: #333333;">

        <!-- Greeting -->
        <tr>
          <td style="font-size: 16px; padding-bottom: 20px;">
            Hi <strong>{{pcom_id}} - {{name}}</strong>,
          </td>
        </tr>

        <!-- Update Info -->
        <tr>
          <td style="font-size: 15px; padding-bottom: 15px; padding-left: 20px; line-height: 1.6;">
            The <strong>{{company_full}}</strong> section has been updated with new content on <strong>{{updated_at}}</strong>.
            You are expected to stay current with all relevant company information and materials.
          </td>
        </tr>

        <!-- Instruction -->
        <tr>
          <td style="font-size: 15px; padding-bottom: 12px;">
            You can access the latest resources using the links below:
          </td>
        </tr>

        <!-- Links -->
        <tr>
          <td style="font-size: 15px;">
            <ul style="padding-left: 20px; margin-top: 0; margin-bottom: 15px; font-size: 15px;">
              {{dynamic_links}}
            </ul>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top: 1px solid #e0e0e0; padding-top: 20px; font-size: 14px; color: #666666;">
            Regards,<br />
            <strong>Placement Systems</strong>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`,

  PREP: `
<table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa; padding: 30px;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 10px; padding: 30px; font-family: Arial, sans-serif; color: #333333;">

        <!-- Greeting -->
        <tr>
          <td style="font-size: 16px; padding-bottom: 20px;">
            Hi <strong>{{pcom_id}} - {{name}}</strong>,
          </td>
        </tr>

        <!-- Domain Update -->
        <tr>
          <td style="font-size: 15px; padding-bottom: 15px; padding-left: 20px;">
            The <strong>{{domain}}</strong> domain preparation section has been updated with new resources as of <strong>{{updated_at}}</strong>.
            All students associated with this domain are expected to review the updated content without delay.
          </td>
        </tr>

        <!-- Instruction -->
        <tr>
          <td style="font-size: 15px; padding-bottom: 10px;">
            Please refer to the following links to access the latest materials:
          </td>
        </tr>

        <!-- Domain Link -->
        <tr>
          <td style="font-size: 15px;">
            <ul style="padding-left: 20px; margin-top: 5px; font-size: 15px;">
              <li><a href="{{domain_link}}" style="color: #007bff; text-decoration: underline; font-weight: 500;">{{domain_link_name}}</a></li>
            </ul>
          </td>
        </tr>

        <!-- Reminder -->
        <tr>
          <td style="font-size: 15px; padding-top: 15px;">
            You are expected to review the materials thoroughly. No further communication will be sent regarding this update, unless deemed necessary.
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top: 20px; font-size: 14px; color: #666666;">
            Regards,<br />
            <strong>Placement Systems</strong>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`,

  CUSTOM: ``
};


export function renderBodyTemplate(type: TemplateTypes, variables: Record<string, string>) {
    let html = bodyTemplates[type];
    for (const key in variables) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
    }
    return html;
}

export function renderTemplate(source: string, variables: Record<string, string>) {
    let html = source;
    for (const key in variables) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
    }
    return html;
}

export function renderBriefTemplate(type: TemplateTypes, variables: Record<string, string>) {
  let html = briefTemplate[type];
  for (const key in variables) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
  }
  return html;
}

export function renderSubjectTemplate(type: TemplateTypes, variables: Record<string, string>) {
    let html = subjectTemplates[type];
    for (const key in variables) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
    }
    return html;
}
