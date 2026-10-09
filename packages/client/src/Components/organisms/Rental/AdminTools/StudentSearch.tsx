"use client";

import { useState } from "react";
import {
    Box,
    Button,
    Input,
    VStack,
    HStack,
    Text,
    Card,
    Spinner,
    Stack,
} from "@chakra-ui/react";
import FieldComponent from "@scspace-client/Components/atoms/Field";
import { IUser } from "@scspace-depot/types/user";
import { useMutationApi } from "@scspace-client/Hooks/api";

interface StudentSearchProps {
    onSelect: (user: IUser) => void;
}

export default function StudentSearch({ onSelect }: StudentSearchProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

    const searchMutation = useMutationApi<
        IUser[],
        { q: string; limit: number }
    >(
        "/user/search",
        "GET",
    );

    const handleSearch = () => {
        const q = searchQuery.trim();
        if (q) {
            setHasSearched(true);
            searchMutation.mutate({
                q,
                limit: 20,
            });
        }
    };

    const users = searchMutation.data || [];
    const isLoading = searchMutation.isPending;
    const isError = searchMutation.isError;

    return (
        <VStack align="stretch" gap={4}>
            <FieldComponent
                options={{
                    label: "Search Student",
                    helpertext: "Search by student number or name",
                }}
            >
                <HStack>
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter student number or name"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                    />
                    <Button
                        onClick={handleSearch}
                        colorPalette="blue"
                        disabled={!searchQuery.trim() || isLoading}
                    >
                        Search
                    </Button>
                </HStack>
            </FieldComponent>

            {isLoading && (
                <Box textAlign="center" py={4}>
                    <Spinner />
                </Box>
            )}

            {isError && (
                <Text color="red.500" textAlign="center">
                    Error searching for users. Please try again.
                </Text>
            )}

            {hasSearched && !isLoading && users.length === 0 && (
                <Text color="gray.500" textAlign="center">
                    No users found
                </Text>
            )}

            {users.length > 0 && (
                <Stack gap={2}>
                    {users.map((user) => (
                        <Card.Root key={user.id} variant="outline">
                            <Card.Body>
                                <HStack justify="space-between">
                                    <VStack align="start" gap={1}>
                                        <Text fontWeight="bold">
                                            {user.nameKr} ({user.nameEn})
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            Student #: {user.studentNumber}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            Email: {user.email}
                                        </Text>
                                    </VStack>
                                    <Button
                                        size="sm"
                                        colorPalette="blue"
                                        onClick={() => onSelect(user)}
                                    >
                                        Select
                                    </Button>
                                </HStack>
                            </Card.Body>
                        </Card.Root>
                    ))}
                </Stack>
            )}
        </VStack>
    );
}
