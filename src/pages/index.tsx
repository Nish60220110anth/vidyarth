import { GetServerSideProps, InferGetServerSidePropsType, NextPage } from 'next';
import LoginPage from './login';
import { UAParser } from 'ua-parser-js';


function isIIMLRouterIP(ip: string): boolean {

  if (!ip) return false;

  if (ip === '127.0.0.1' || ip === '::1') return true;

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => isNaN(n))) return false;

  const [a, b, c] = parts;
  return (a === 192 && b === 168 && c >= 80 && c <= 95);
}

type LoginPageProps = {
  ip?: string;
  IIMLPrivate?: boolean;
  userAgent?: string;
  language?: string;
};

const Home: NextPage<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ ip, IIMLPrivate, userAgent, language }) => {
  return (
    <>
      <LoginPage 
        ip={ip}
        IIMLPrivate={IIMLPrivate}
        userAgent={userAgent}
        language={language}
      />
    </>

  );
};


export const getServerSideProps: GetServerSideProps<LoginPageProps> = async (context) => {
  const req = context.req;
  const forwarded = req.headers['x-forwarded-for'];
  let ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || '';

  // TEMP for testing
  // ip = "192.168.85.170";

  console.log('Client IP:', ip);

  // 📦 Parse browser info
  const parser = new UAParser(req.headers['user-agent']);
  const browserInfo = parser.getBrowser(); // { name: 'Chrome', version: '113.0.0.0' }
  const osInfo = parser.getOS();           // { name: 'Windows', version: '10' }

  const userAgent = `${browserInfo.name || 'Unknown'} ${browserInfo.version || ''} on ${osInfo.name || 'OS'} ${osInfo.version || ''}`.trim();

  // 🌐 Parse language from accept-language
  const rawLang = req.headers['accept-language'] || '';
  const language = rawLang.split(',')[0] || 'Unknown';

  // const isIIMLPrivate = isIIMLRouterIP(ip);
  const isIIMLPrivate = true;

  if (!isIIMLPrivate) {
    return {
      redirect: {
        destination: '/restricted-entry',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ip,
      isIIMLPrivate,
      userAgent,
      language,
    },
  };
};

export default Home;
