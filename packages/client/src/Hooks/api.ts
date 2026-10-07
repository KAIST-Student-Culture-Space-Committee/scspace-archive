"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const valueToString = (val: unknown) => {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};

export const useLinkPush = () => {
  const router = useRouter();

  const linkPush = (link: string) => {
    router.push(link);
  };

  return { router, linkPush };
};

export const useQueryApi = <ResponseType>(
  endpoint: string,
  params?: object,
  options?: { enabled?: boolean },
) => {
  const queryKey = [endpoint, params || {}];

  return useQuery<ResponseType>({
    queryKey,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const queryString = params
        ? "?" +
        new URLSearchParams(
          Object.entries(params).map(([key, val]) => [
            key,
            valueToString(val),
          ]),
        ).toString()
        : "";
      const res = await fetch(`${baseUrl}${endpoint}${queryString}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    },
  });
};

export const useFormDataMutation = <ResponseType>(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE" | "GET" | "PATCH",
) => {
  const queryClient = useQueryClient();

  return useMutation<
    ResponseType,
    Error,
    FormData
  >({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        credentials: "include",
        body: formData
      });

      if (!res.ok) {
        let errorMessage = res.statusText;

        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || res.statusText;
          console.log(errorData, errorMessage);
        } catch (parseError) {
          console.log("JSON parsing fail");
        }

        throw new Error(errorMessage);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
  });
}

export const useMutationApi = <ResponseType, RequestParamType extends object>(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE" | "GET" | "PATCH",
) => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestParamType>({
    mutationFn:
      method === "GET"
        ? async (content?: RequestParamType) => {
          const queryString = content
            ? "?" +
            new URLSearchParams(
              Object.entries(content).map(([key, val]) => [
                key,
                valueToString(val),
              ]),
            ).toString()
            : "";
          const res = await fetch(`${baseUrl}${endpoint}${queryString}`, {
            credentials: "include",
          });

          if (!res.ok) {
            let errorMessage = res.statusText;

            try {
              const errorData = await res.json();
              errorMessage = errorData.message || errorData.error || res.statusText;
              console.log(errorData, errorMessage);
            } catch (parseError) {
              console.log("JSON parsing fail");
            }

            throw new Error(errorMessage);
          }

          return res.json();
        }
        : async (content?: RequestParamType) => {
          const res = await fetch(`${baseUrl}${endpoint}`, {
            method,
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(content ?? {}),
          });

          if (!res.ok) {
            let errorMessage = res.statusText;

            try {
              const errorData = await res.json();
              errorMessage = errorData.message || errorData.error || res.statusText;
              console.log(errorData, errorMessage);
            } catch (parseError) {
              console.log("JSON parsing fail");
            }

            throw new Error(errorMessage);
          }

          return res.json();
        },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
  });
};
