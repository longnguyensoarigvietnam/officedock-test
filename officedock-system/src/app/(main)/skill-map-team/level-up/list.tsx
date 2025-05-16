'use client';
import { useState } from 'react';

import { SubmitLevelByOrganization } from '@interfaces/skills';

import useSubmitLevelListByOrganizations from '@hooks/useSubmitLevelListByOrganizations';

import { LevelUpListByOrganization } from './level-up-list-by-organization';

const LevelUpList = () => {
  const [submitLevelUpByOrganization, setSubmitLevelUpByOrganization] =
    useState<SubmitLevelByOrganization[]>([]);

  // Hooks
  useSubmitLevelListByOrganizations({
    onSuccess: (data) => {
      setSubmitLevelUpByOrganization(data);
    },
  });

  return (
    <div className="w-full">
      {submitLevelUpByOrganization.length > 0 &&
        submitLevelUpByOrganization.map((orgSubmitLevel, index) => {
          return (
            <LevelUpListByOrganization
              key={index}
              orgSubmitLevel={orgSubmitLevel}
            />
          );
        })}
    </div>
  );
};

export default LevelUpList;
