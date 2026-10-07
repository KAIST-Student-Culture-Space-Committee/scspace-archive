"use client"

import { useAuth, useAuthAPI } from "@scspace-client/Hooks/auth";
import { Button, Menu, Portal } from "@chakra-ui/react";
import { useLinkPush } from "@scspace-client/Hooks/api";

export default function LoginBtn() {
  const { isLogined, userInfo, refetch } = useAuth();
  const { linkPush } = useLinkPush();
  const { logout } = useAuthAPI();

  return isLogined ? (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          variant="outline"
          rounded="sm"
        >
          {userInfo?.nameKr}님
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item
              value="mypage"
              onClick={() => linkPush('/mypage')}
            >
              Mypage
            </Menu.Item>
            <Menu.Item
              value="logout"
              color="fg.error"
              _hover={{ bg: "bg.error", color: "fg.error" }}
              onClick={() => logout(refetch)}
            >
              Logout
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  ) : (
    <Button variant="outline" rounded="sm" onClick={() => linkPush('/login')}>
      Login
    </Button>
  );
};
