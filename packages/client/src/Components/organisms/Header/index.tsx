"use client"

import {
  Box,
  Flex,
  Spacer,
  Stack,
} from "@chakra-ui/react";
import LoginBtn from "@scspace-client/Components/organisms/Header/LoginBtn";
import BreadcrumbComponent from "@scspace-client/Components/organisms/Header/Breadcrumb";
import Sidebar from "@scspace-client/Components/organisms/Header/Sidebar";
import { useRedirects } from "@scspace-client/Store/redirect/reset";
import PasspinHeader from "./Passpin";
import OfficeHoursStatusHeader from "./OfficeHoursStatus";

export default function Header() {
  useRedirects();

  return (
    <Stack
      top={0}
      w="100%"
      bg="white"
      boxShadow="sm"
      zIndex={100}
      gap={0}
      justify={"center"}
    >
      <Flex
        px={4}
        py={2}
        gap={6}
        align="center"
        h={"56px"}
      >
        <Sidebar />
        <BreadcrumbComponent />
        <Spacer />
        <OfficeHoursStatusHeader />
        <PasspinHeader />
        <LoginBtn />
      </Flex>
    </Stack>
  );
};
