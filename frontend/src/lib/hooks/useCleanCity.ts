"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import CleanCity from "../contracts/CleanCity";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import type { Bounty, Submission, WorkerProfile } from "../contracts/types";


export function useCleanCityContract(): CleanCity | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  const contract = useMemo(() => {
    // Validate contract address is configured
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set VITE_CONTRACT_ADDRESS in your .env file.",
        {
          label: "Setup Guide",
          onClick: () => window.open("/docs/setup", "_blank")
        }
      );
      // Return null to indicate contract is not available
      return null;
    }

    // Contract instance is recreated when address changes to ensure
    // the genlayer-js client is properly configured with the current account
    return new CleanCity(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);

  return contract;
}


export function useWorkerSubmissions(wallet: string) {
  const contract = useCleanCityContract();

  return useQuery<Submission[], Error>({
    queryKey: ["worker_submissions"],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve([]);
      }
      return contract.getWorkerSubmissions(wallet);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract, // Only run query if contract is available
  });
}
export function useBounties() {
  const contract = useCleanCityContract();

  return useQuery<Bounty[], Error>({
    queryKey: ["bounties"],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve([]);
      }
      return contract.getBounties();
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract, // Only run query if contract is available
  });
}


export function useBounty(bountyId: string) {
  const contract = useCleanCityContract();

  return useQuery<Bounty, Error>({
    queryKey: ["bounty", bountyId],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve({} as Bounty);
      }
      return contract.getBounty(bountyId);
    },
    refetchOnWindowFocus: true,
    enabled: !!bountyId && !!contract, // Require both address and contract
    staleTime: 2000,
  });
}

export function useWorkerProfile(workerId: string) {
  const contract = useCleanCityContract();

  return useQuery<WorkerProfile, Error>({
    queryKey: ["workerProfile", workerId],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve({} as WorkerProfile);
      }
      return contract.getWorkerProfile(workerId);
    },
    refetchOnWindowFocus: true,
    enabled: !!workerId && !!contract, // Require both address and contract
    staleTime: 2000,
  });
}


export function useSubmission(submissionId: string) {
  const contract = useCleanCityContract();

  return useQuery<Submission, Error>({
    queryKey: ["submission", submissionId],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve({} as Submission);
      }
      return contract.getSubmission(submissionId);
    },
    refetchOnWindowFocus: true,
    enabled: !!submissionId && !!contract, // Require both address and contract
    staleTime: 2000,
  });
}



export function useClaimBounty() {
  const contract = useCleanCityContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bounty_id
    }: {
      bounty_id: string,
    }) => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }
      const receipt = await contract.ClaimBounty(bounty_id);
      console.log("claim bounty tx receipt:", receipt);
      return receipt;
    },

    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["bounty", variables.bounty_id],
      });
    },
    onError: async (error: any) => {
      console.error("Error claiming bounty:", error);
      throw new Error("Failed to create bounty, Please try again.");
    }
  });
}

export function useCreateBounty() {
  const contract = useCleanCityContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      location_description,
      category,
      before_image_url,
      reward_gen,
      duration_seconds,
      max_workers
    }: {
      title: string,
      description: string,
      location_description: string,
      category: string,
      before_image_url: string,
      reward_gen: number,
      duration_seconds: number,
      max_workers: number
    }) => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }
      const receipt = await contract.CreateBounty(title,
        description,
        location_description,
        category,
        before_image_url,
        reward_gen,
        duration_seconds,
        max_workers);
      console.log("create bounty tx receipt:", receipt);
      return receipt;
    },

    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["bounties"],
      });
    },
    onError: async (error: any) => {
      console.error("Error creating bounty:", error);
      throw new Error("Failed to create bounty, Please try again.");
    }
  });
}


export function useSubmitProof() {
  const contract = useCleanCityContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bounty_id,
      after_image_url,
      session_token,
      notes
    }: {
      bounty_id: string,
      after_image_url: string,
      session_token: string,
      notes: string
    }) => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }
      const receipt = await contract.submitProof(bounty_id,
        after_image_url,
        session_token,
        notes);
      console.log("submit proof tx receipt:", receipt);
      return receipt;
    },

    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["bounties"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["bounty", variables.bounty_id],
      });
    },
    onError: async (error: any) => {
      console.error("Error submitting proof:", error);
      throw new Error("Failed to submit proof, Please try again.");
    }
  });
}

export function useAppealRejection() {
  const contract = useCleanCityContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submission_id,
      appeal_context,
      additional_image_url
    }: {
      submission_id: string,
      appeal_context: string,
      additional_image_url: string
    }) => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }
      const receipt = await contract.appealRejection(submission_id,
        appeal_context,
        additional_image_url);
      console.log("submit appeal tx receipt:", receipt);
      return receipt;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["bounties"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["bounty", variables.submission_id],
      });
    },
    onError: async (error: any) => {
      console.error("Error submitting appeal:", error);
      throw new Error("Failed to submit appeal, Please try again.");
    }
  });
}



export function useGenerateSessionToken() {
  const contract = useCleanCityContract();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bounty_id,
    }: {
      bounty_id: string,
    }) => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }
      const receipt = await contract.generateSessionToken(bounty_id);
      console.log("generate session token tx receipt:", receipt);
      return receipt;
    },

    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["bounties"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["bounty", variables.bounty_id],
      });
    },
    onError: async (error: any) => {
      console.error("Error generating session token:", error);
      throw new Error("Failed to generate session token, Please try again.");
    }
  });
}
