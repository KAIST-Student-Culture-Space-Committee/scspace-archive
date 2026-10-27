import { Box, IconButton, Link, Mark, Separator, Stack, Text } from "@chakra-ui/react";
import { IoLogoInstagram, IoMailOutline } from "react-icons/io5";
import { OFFICE_HOURS_EN, OFFICE_HOURS_KO } from "@scspace-depot/consts/office-hours.const";

export default function ContactSection() {
    return (
        <Box as="section" bg="gray.50" pb={{ base: 16, md: 24 }} px={{ base: 6, md: 20 }}>
            <Stack>
                <Text fontWeight={"semibold"}>
                    KAIST 학부 총학생회 산하 학생문화공간위원회
                </Text>
                <Text fontSize={"sm"}>
                    <Mark>Student Culture & Space Committee,</Mark> <Mark>under KAIST Undergraduate Student Council</Mark>
                </Text>
                <Separator />
                <Text color="gray.500" fontSize={"sm"}>
                    대전광역시 유성구 대학로 291 한국과학기술원
                    <br />
                    N13-1 장영신학생회관 309호
                </Text>
                <Text color="gray.500" fontSize={"sm"}>
                    상근시간: {OFFICE_HOURS_KO}
                    <br />
                    Office hours: {OFFICE_HOURS_EN}
                </Text>
                <Link
                    target='_blank'
                    href={"mailto:scspace@kaist.ac.kr"}
                    color="gray.500" fontSize={"sm"}
                >
                    <IoMailOutline /> scspace@kaist.ac.kr
                </Link>
                <Link
                    target='_blank'
                    href={"https://instagram.com/scspace_kaist"}
                    color="gray.500" fontSize={"sm"}
                >
                    <IoLogoInstagram /> @scspace_kaist
                </Link>
            </Stack>
        </Box>
    );
}
