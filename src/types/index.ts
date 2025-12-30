import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: JwtPayload & { id: string; email: string };
}

export interface ComparisonRequest {
  retailers: string[];
  country: string;
}

export interface ComparisonResult {
  retailer: {
    id: string;
    name: string;
  };
  country: {
    id: string;
    name: string;
    code: string;
  };
  methods: {
    method: string;
    cost: string;
    duration: string;
    freeShippingThreshold?: string;
    carrier?: string;
    additionalNotes?: string;
  }[];
  cheapestOption?: {
    method: string;
    cost: string;
    duration: string;
  };
}

export interface CSVRow {
  retailer: string;
  country: string;
  method: string;
  cost: string;
  duration: string;
  freeShippingThreshold?: string;
  carrier?: string;
  additionalNotes?: string;
}




