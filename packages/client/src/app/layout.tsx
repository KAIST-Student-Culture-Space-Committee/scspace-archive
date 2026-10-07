import "./globals.css";
import "../../static/css/main.css";
import Header from "@scspace-client/Components/organisms/Header";
import { ReactNode } from "react";
import Providers from "./providers";
import { Grid, } from "@chakra-ui/react";
import ToasterComponent from "@scspace-client/Components/atoms/Toaster";
import LayoutBox from "./padding";
import MatchPredictHeader from "@scspace-client/Components/organisms/Header/MatchPredictHeader";
import LoginRedirectHandler from "@scspace-client/Components/atoms/LoginRedirectHandler";

export const metadata = {
  title: "KAIST SCSpace",
  description: "Website for KAIST Student Curture and Space Commitee",
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="shortcut icon" href="/img/logo.svg" />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn3.devexpress.com/jslib/22.1.4/css/dx.common.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn3.devexpress.com/jslib/22.1.4/css/dx.light.css"
        />
      </head>
      <body>
        <Providers>
          <LoginRedirectHandler />
          <ToasterComponent />
          <Grid
            width="100dvw"
            height="100dvh"
            direction="column"
            templateRows="auto 1fr"
          >
            <MatchPredictHeader />
            <LayoutBox>
              {children}
            </LayoutBox>
          </Grid>
        </Providers>
      </body>
    </html>
  );
}
