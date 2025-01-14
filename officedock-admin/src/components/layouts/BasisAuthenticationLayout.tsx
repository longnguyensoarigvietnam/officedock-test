'use client';
import React, { Fragment, ReactNode } from 'react';

type BasisAuthenticationType = {
  children?: ReactNode;
};

const BasisAuthenticationLayout = ({ children }: BasisAuthenticationType) => {
  return <Fragment>{children}</Fragment>;
};

export default BasisAuthenticationLayout;
