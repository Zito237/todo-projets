# language: fr
@compte
Fonctionnalité: Créer un compte et se connecter
  Afin que mes projets et mes tâches ne soient visibles que par moi
  En tant qu'utilisateur de l'application To-Do
  Je veux créer mon compte, me connecter et me déconnecter

  Contexte:
    Soit l'application To-Do est ouverte dans un navigateur neuf

  # ---------- Page « Créer un compte » ----------

  @connexion
  Scénario: Sans session, l'application affiche la page de connexion
    Alors la page "Se connecter" est affichée
    Et les projets ne sont pas visibles

  @inscription
  Scénario: Créer un compte connecte directement l'utilisateur
    Quand je crée le compte "awa.ngono" avec le mot de passe "Soleil2026"
    Alors je suis connecté en tant que "awa.ngono"
    Et l'application indique qu'il n'y a aucun projet

  # Valeurs limites (séance 4) : l'identifiant fait de 3 à 30 caractères
  @inscription @limite
  Plan du scénario: Bornes de la longueur de l'identifiant
    Quand je crée un compte dont l'identifiant fait <longueur> caractères
    Alors <résultat>

    Exemples:
      | longueur | résultat                                                                            |
      | 2        | le message d'erreur "L'identifiant doit faire entre 3 et 30 caractères" est affiché |
      | 3        | le compte est créé et la session est ouverte                                        |
      | 30       | le compte est créé et la session est ouverte                                        |
      | 31       | le message d'erreur "L'identifiant doit faire entre 3 et 30 caractères" est affiché |

  # Valeurs limites : le mot de passe fait de 8 à 64 caractères
  @inscription @limite
  Plan du scénario: Bornes de la longueur du mot de passe
    Quand je crée un compte dont le mot de passe fait <longueur> caractères
    Alors <résultat>

    Exemples:
      | longueur | résultat                                                                              |
      | 7        | le message d'erreur "Le mot de passe doit faire entre 8 et 64 caractères" est affiché |
      | 8        | le compte est créé et la session est ouverte                                          |
      | 64       | le compte est créé et la session est ouverte                                          |
      | 65       | le message d'erreur "Le mot de passe doit faire entre 8 et 64 caractères" est affiché |

  # Une classe d'équivalence invalide par ligne, le reste du formulaire étant valide
  @inscription @negatif
  Plan du scénario: Refuser un formulaire de création invalide
    Quand je crée le compte "<identifiant>" avec le mot de passe "<mot de passe>" et la confirmation "<confirmation>"
    Alors le message d'erreur "<message>" est affiché
    Et la page "Créer un compte" est affichée

    Exemples:
      | identifiant | mot de passe | confirmation | message                                                                                                      |
      |             | Soleil2026   | Soleil2026   | L'identifiant est obligatoire                                                                                |
      | awa ngono   | Soleil2026   | Soleil2026   | L'identifiant ne peut contenir que des lettres sans accent, des chiffres, le point, le tiret et le tiret bas |
      | élodie      | Soleil2026   | Soleil2026   | L'identifiant ne peut contenir que des lettres sans accent, des chiffres, le point, le tiret et le tiret bas |
      | awa.ngono   |              |              | Le mot de passe est obligatoire                                                                              |
      | awa.ngono   | abcdefgh     | abcdefgh     | Le mot de passe doit contenir au moins une lettre et un chiffre                                              |
      | awa.ngono   | 12345678     | 12345678     | Le mot de passe doit contenir au moins une lettre et un chiffre                                              |
      | awa.ngono   | Soleil2026   | Soleil2027   | Les deux mots de passe ne sont pas identiques                                                                |

  @inscription @negatif
  Scénario: Refuser un identifiant déjà utilisé, même écrit avec une autre casse
    Soit le compte "Awa.Ngono" existe avec le mot de passe "Soleil2026"
    Quand je crée le compte "awa.NGONO" avec le mot de passe "Lune2027x"
    Alors le message d'erreur "Cet identifiant est déjà utilisé" est affiché
    Et la page "Créer un compte" est affichée

  @inscription
  Scénario: Passer de la page de connexion à la page de création, et revenir
    Quand j'ouvre la page "Créer un compte"
    Alors la page "Créer un compte" est affichée
    Quand j'ouvre la page "Se connecter"
    Alors la page "Se connecter" est affichée

  # ---------- Page « Se connecter » ----------

  @connexion
  Scénario: Se connecter avec un compte existant
    Soit le compte "Awa.Ngono" existe avec le mot de passe "Soleil2026"
    Quand je me connecte avec "Awa.Ngono" et le mot de passe "Soleil2026"
    Alors je suis connecté en tant que "Awa.Ngono"

  @connexion
  Scénario: L'identifiant est reconnu sans tenir compte de la casse
    Soit le compte "Awa.Ngono" existe avec le mot de passe "Soleil2026"
    Quand je me connecte avec "awa.ngono" et le mot de passe "Soleil2026"
    Alors je suis connecté en tant que "Awa.Ngono"

  # Identifiant inconnu et mauvais mot de passe : même message (on ne dit pas lequel est faux)
  @connexion @negatif
  Plan du scénario: Refuser une connexion
    Soit le compte "Awa.Ngono" existe avec le mot de passe "Soleil2026"
    Quand je me connecte avec "<identifiant>" et le mot de passe "<mot de passe>"
    Alors le message d'erreur "<message>" est affiché
    Et la page "Se connecter" est affichée
    Et le champ du mot de passe est vide

    Exemples:
      | identifiant | mot de passe | message                               |
      | Awa.Ngono   | Pluie2026x   | Identifiant ou mot de passe incorrect |
      | personne    | Soleil2026   | Identifiant ou mot de passe incorrect |
      | Awa.Ngono   | soleil2026   | Identifiant ou mot de passe incorrect |
      |             | Soleil2026   | L'identifiant est obligatoire         |
      | Awa.Ngono   |              | Le mot de passe est obligatoire       |

  @connexion
  Scénario: Se déconnecter ramène à la page de connexion
    Soit je suis connecté avec un nouveau compte "awa"
    Et le projet "Maison" existe
    Quand je me déconnecte
    Alors la page "Se connecter" est affichée
    Et les projets ne sont pas visibles

  # ---------- Session ----------

  @connexion @persistance
  Scénario: Rester connecté après le rechargement de la page
    Soit je suis connecté avec un nouveau compte "awa"
    Et le projet "Maison" existe
    Quand je recharge la page
    Alors je suis connecté en tant que "awa"
    Et la liste des projets est :
      | Maison |

  @connexion @persistance
  Scénario: Après une déconnexion, recharger la page ne reconnecte pas
    Soit je suis connecté avec un nouveau compte "awa"
    Et je me déconnecte
    Quand je recharge la page
    Alors la page "Se connecter" est affichée

  # ---------- Chacun ses projets ----------

  @isolation
  Scénario: Un nouvel utilisateur ne voit pas les projets des autres
    Soit je suis connecté avec un nouveau compte "awa"
    Et le projet "Maison" existe
    Et la tâche "Arroser les plantes" existe dans ce projet
    Et je me déconnecte
    Quand je crée le compte "binta" avec le mot de passe "Lune2027x"
    Alors je suis connecté en tant que "binta"
    Et l'application indique qu'il n'y a aucun projet

  @isolation
  Scénario: Deux utilisateurs ont chacun leur projet du même nom et retrouvent leurs tâches
    Soit le compte "awa" existe avec le mot de passe "Soleil2026"
    Et je me connecte avec "awa" et le mot de passe "Soleil2026"
    Et le projet "Maison" existe
    Et la tâche "Arroser les plantes" existe dans ce projet
    Et je me déconnecte
    Et je crée le compte "binta" avec le mot de passe "Lune2027x"
    Et le projet "Maison" existe
    Et la tâche "Ranger le garage" existe dans ce projet
    Et je me déconnecte
    Quand je me connecte avec "awa" et le mot de passe "Soleil2026"
    Alors la liste des projets est :
      | Maison |
    Et le projet "Maison" contient les tâches :
      | Arroser les plantes |

  # ---------- Mot de passe ----------

  @securite
  Scénario: Le mot de passe n'est enregistré nulle part en clair
    Quand je crée le compte "awa.ngono" avec le mot de passe "Soleil2026"
    Alors je suis connecté en tant que "awa.ngono"
    Et le navigateur ne conserve nulle part le texte "Soleil2026"
