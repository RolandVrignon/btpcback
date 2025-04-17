/**
 * Préserve l'ordre des champs dans un objet JSON en ajoutant des métadonnées
 * @param data Données JSON à traiter
 * @returns Données JSON avec métadonnées d'ordre
 */
const preserveFieldOrder = (data: unknown): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    // Pour les tableaux, vérifier si ce sont des objets similaires
    if (
      data.length > 0 &&
      typeof data[0] === 'object' &&
      !Array.isArray(data[0])
    ) {
      // Vérifier si tous les objets ont les mêmes clés
      const firstItemKeys = Object.keys(data[0]);
      const allSameKeys = data.every(
        (item) =>
          typeof item === 'object' &&
          !Array.isArray(item) &&
          Object.keys(item).length === firstItemKeys.length &&
          firstItemKeys.every((key) => key in item),
      );

      if (allSameKeys) {
        // Stocker un seul fieldOrder pour tout le tableau
        const processedItems = data.map((item) => {
          const processedItem: Record<string, any> = {};
          for (const key of firstItemKeys) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            processedItem[key] = preserveFieldOrder(item[key]);
          }
          return processedItem;
        });

        // Retourner un objet avec les données et l'ordre des champs
        return {
          __data: processedItems,
          __fieldOrder: firstItemKeys,
          __isArray: true,
        };
      }
    }

    // Si ce n'est pas un tableau d'objets similaires, traiter chaque élément individuellement
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return data.map((item) => preserveFieldOrder(item));
  }

  // Pour les objets
  const fieldOrder = Object.keys(data);
  const processedData: Record<string, any> = {};

  // Traiter chaque champ
  for (const key of fieldOrder) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const processedValue = preserveFieldOrder(data[key]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    processedData[key] = processedValue;
  }

  // Ajouter les métadonnées d'ordre
  return {
    __data: processedData,
    __fieldOrder: fieldOrder,
  };
};

/**
 * Restaure l'ordre des champs à partir des métadonnées
 * @param data Données JSON avec métadonnées d'ordre
 * @returns Données JSON avec l'ordre original
 */
const restoreFieldOrder = (data: any): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    // Pour les tableaux, traiter chaque élément
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return data.map((item) => restoreFieldOrder(item));
  }

  // Vérifier si c'est un tableau d'objets similaires avec un seul fieldOrder
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (data.__data && data.__fieldOrder && data.__isArray === true) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const items = data.__data;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const fieldOrder = data.__fieldOrder;

    // Reconstruire chaque élément du tableau avec le même ordre de champs
    if (!Array.isArray(items)) {
      return items;
    }

    return items.map((item: any) => {
      const result: Record<string, any> = {};
      for (const key of fieldOrder) {
        if (key in item) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          result[key] = restoreFieldOrder(item[key]);
        }
      }
      return result;
    });
  }

  // Vérifier si c'est un objet avec métadonnées d'ordre
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (data.__data && data.__fieldOrder && Array.isArray(data.__fieldOrder)) {
    const result: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const orderedData = data.__data;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const fieldOrder = data.__fieldOrder;

    // Reconstruire l'objet selon l'ordre des champs
    for (const key of fieldOrder) {
      if (key in orderedData) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        result[key] = restoreFieldOrder(orderedData[key]);
      }
    }

    return result;
  }

  // Pour les objets sans métadonnées d'ordre
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    result[key] = restoreFieldOrder(value);
  }

  return result;
};

export { preserveFieldOrder, restoreFieldOrder };
