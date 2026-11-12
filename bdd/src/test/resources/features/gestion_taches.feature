# language: fr
@todo
Fonctionnalité: Gérer mes tâches par projet
  Afin d'organiser mon travail
  En tant qu'utilisateur de l'application To-Do
  Je veux ranger mes tâches dans des projets, les ajouter et les modifier sans les perdre en fermant la page

  Contexte:
    Soit l'application To-Do est ouverte dans un navigateur neuf

  # ---------- Projets ----------

  @projet
  Scénario: Aucun projet au premier lancement
    Alors l'application indique qu'il n'y a aucun projet

  @projet
  Scénario: Créer un projet
    Quand je crée le projet "Mémoire Master 2"
    Alors la liste des projets est :
      | Mémoire Master 2 |
    Et le projet affiché est "Mémoire Master 2"

  @projet
  Scénario: Les projets sont classés par ordre alphabétique
    Quand je crée le projet "Travail"
    Et je crée le projet "école"
    Et je crée le projet "Maison"
    Alors la liste des projets est :
      | école   |
      | Maison  |
      | Travail |

  @projet @negatif
  Scénario: Refuser un projet portant déjà ce nom
    Soit le projet "Maison" existe
    Quand je crée le projet "MAISON"
    Alors le message d'erreur "Un projet porte déjà ce nom" est affiché
    Et la liste des projets est :
      | Maison |

  # ---------- Ajouter une tâche ----------

  @ajout
  Scénario: Ajouter une tâche avec une échéance
    Soit le projet "Mémoire Master 2" existe
    Quand j'ajoute la tâche "Rédiger le chapitre 2" avec l'échéance "2027-06-30"
    Alors le projet "Mémoire Master 2" contient les tâches :
      | Rédiger le chapitre 2 |
    Et la tâche "Rédiger le chapitre 2" a l'échéance "30/06/2027"
    Et le compteur indique "1 à faire sur 1"

  @ajout @negatif
  Scénario: Refuser une tâche sans titre
    Soit le projet "Maison" existe
    Quand j'ajoute la tâche ""
    Alors le message d'erreur "Le titre de la tâche est obligatoire" est affiché
    Et le projet "Maison" ne contient aucune tâche

  # Valeurs limites (séance 4) : le titre fait au plus 120 caractères
  @ajout @limite
  Plan du scénario: Longueur maximale du titre d'une tâche
    Soit le projet "Maison" existe
    Quand j'ajoute une tâche dont le titre fait <longueur> caractères
    Alors le nombre de tâches du projet "Maison" est <nombre>

    Exemples:
      | longueur | nombre |
      | 1        | 1      |
      | 120      | 1      |
      | 121      | 0      |

  # ---------- Tâches et projets ----------

  @projet @ajout
  Scénario: Chaque tâche appartient à son projet
    Soit le projet "Mémoire Master 2" existe
    Et la tâche "Rédiger le chapitre 2" existe dans ce projet
    Et le projet "Maison" existe
    Et la tâche "Payer la facture ENEO" existe dans ce projet
    Alors le projet "Maison" contient les tâches :
      | Payer la facture ENEO |
    Et le projet "Mémoire Master 2" contient les tâches :
      | Rédiger le chapitre 2 |

  # ---------- Modifier une tâche ----------

  @modification
  Scénario: Modifier le titre et l'échéance d'une tâche
    Soit le projet "Mémoire Master 2" existe
    Et la tâche "Rédiger le chapitre 2" existe dans ce projet
    Quand je modifie la tâche "Rédiger le chapitre 2" en "Rédiger le chapitre 3" avec l'échéance "2027-07-15"
    Alors le projet "Mémoire Master 2" contient les tâches :
      | Rédiger le chapitre 3 |
    Et la tâche "Rédiger le chapitre 3" a l'échéance "15/07/2027"

  @modification
  Scénario: Annuler une modification
    Soit le projet "Maison" existe
    Et la tâche "Réparer le robinet" existe dans ce projet
    Quand je commence à modifier la tâche "Réparer le robinet" en "Changer le robinet"
    Et j'annule la modification
    Alors le projet "Maison" contient les tâches :
      | Réparer le robinet |

  @modification @negatif
  Scénario: Refuser une modification qui vide le titre
    Soit le projet "Maison" existe
    Et la tâche "Réparer le robinet" existe dans ce projet
    Quand je modifie la tâche "Réparer le robinet" en ""
    Alors le message d'erreur "Le titre de la tâche est obligatoire" est affiché
    Quand j'annule la modification
    Alors le projet "Maison" contient les tâches :
      | Réparer le robinet |

  @modification
  Scénario: Marquer une tâche terminée, qui passe en fin de liste
    Soit le projet "Cours INF563" existe
    Et la tâche "Devoir BDD" existe dans ce projet
    Et la tâche "Réviser la séance 10" existe dans ce projet
    Quand je coche la tâche "Devoir BDD"
    Alors la tâche "Devoir BDD" est terminée
    Et le compteur indique "1 à faire sur 2"
    Et le projet "Cours INF563" contient les tâches :
      | Réviser la séance 10 |
      | Devoir BDD           |

  # ---------- Persistance IndexedDB ----------

  @persistance
  Scénario: Les données sont conservées après rechargement de la page
    Soit le projet "Mémoire Master 2" existe
    Et la tâche "Rédiger le chapitre 2" existe dans ce projet
    Et le projet "Maison" existe
    Et je coche la tâche "Rédiger le chapitre 2" du projet "Mémoire Master 2"
    Quand je recharge la page
    Alors la liste des projets est :
      | Maison           |
      | Mémoire Master 2 |
    Et le projet "Mémoire Master 2" contient les tâches :
      | Rédiger le chapitre 2 |
    Et la tâche "Rédiger le chapitre 2" est terminée
